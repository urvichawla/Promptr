package store

import (
	"database/sql"
	"fmt"
)

var migrations = []func(tx *sql.Tx) error{
	migrateV1,
	migrateV2,
	migrateV3,
	migrateV4,
}

func (s *Store) migrate() error {
	var version int
	if err := s.db.QueryRow("PRAGMA user_version").Scan(&version); err != nil {
		return fmt.Errorf("read schema version: %w", err)
	}
	if version > len(migrations) {
		return fmt.Errorf("database schema version %d is newer than this app supports (%d)", version, len(migrations))
	}

	for v := version; v < len(migrations); v++ {
		tx, err := s.db.Begin()
		if err != nil {
			return fmt.Errorf("start migration %d: %w", v+1, err)
		}
		if err := migrations[v](tx); err != nil {
			tx.Rollback()
			return fmt.Errorf("migration %d: %w", v+1, err)
		}
		if _, err := tx.Exec(fmt.Sprintf("PRAGMA user_version = %d", v+1)); err != nil {
			tx.Rollback()
			return fmt.Errorf("record migration %d: %w", v+1, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit migration %d: %w", v+1, err)
		}
	}
	return nil
}

func migrateV1(tx *sql.Tx) error {
	_, err := tx.Exec(`
		CREATE TABLE prompts (
			id         INTEGER PRIMARY KEY AUTOINCREMENT,
			title      TEXT NOT NULL,
			content    TEXT NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT NOT NULL
		);
		CREATE UNIQUE INDEX prompts_title_unique ON prompts (title COLLATE NOCASE);
		CREATE INDEX prompts_updated_at ON prompts (updated_at);

		CREATE TABLE tags (
			id   INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL UNIQUE
		);

		CREATE TABLE prompt_tags (
			prompt_id INTEGER NOT NULL REFERENCES prompts (id) ON DELETE CASCADE,
			tag_id    INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
			PRIMARY KEY (prompt_id, tag_id)
		);
		CREATE INDEX prompt_tags_tag ON prompt_tags (tag_id);
	`)
	if err != nil {
		return err
	}

	for i := len(samplePrompts) - 1; i >= 0; i-- {
		input := samplePrompts[i]
		if _, err := insertPrompt(tx, normalizeInput(input), now()); err != nil {
			return fmt.Errorf("add sample prompt %q: %w", input.Title, err)
		}
	}
	return nil
}

func migrateV2(tx *sql.Tx) error {
	_, err := tx.Exec(`
		CREATE TABLE settings (
			key   TEXT PRIMARY KEY,
			value TEXT NOT NULL
		)`)
	return err
}

func migrateV3(tx *sql.Tx) error {
	_, err := tx.Exec(`ALTER TABLE prompts ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0`)
	return err
}

func migrateV4(tx *sql.Tx) error {
	_, err := tx.Exec(`
		WITH usage AS (
			SELECT tag_id, COUNT(*) AS uses FROM prompt_tags GROUP BY tag_id
		),
		ranked AS (
			SELECT pt.prompt_id, pt.tag_id,
				ROW_NUMBER() OVER (PARTITION BY pt.prompt_id ORDER BY u.uses DESC, t.name ASC) AS position
			FROM prompt_tags pt
			JOIN usage u ON u.tag_id = pt.tag_id
			JOIN tags t ON t.id = pt.tag_id
		)
		DELETE FROM prompt_tags
		WHERE (prompt_id, tag_id) IN (SELECT prompt_id, tag_id FROM ranked WHERE position > 1);
		DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM prompt_tags);
	`)
	return err
}
