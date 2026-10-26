package store

import (
	"database/sql"
	"errors"
	"fmt"
)

func (s *Store) Setting(key, fallback string) (string, error) {
	var value string
	err := s.db.QueryRow(`SELECT value FROM settings WHERE key = ?`, key).Scan(&value)
	if errors.Is(err, sql.ErrNoRows) {
		return fallback, nil
	}
	if err != nil {
		return fallback, fmt.Errorf("couldn't read setting %q: %w", key, err)
	}
	return value, nil
}

func (s *Store) SetSetting(key, value string) error {
	_, err := s.db.Exec(`
		INSERT INTO settings (key, value) VALUES (?, ?)
		ON CONFLICT (key) DO UPDATE SET value = excluded.value`, key, value)
	if err != nil {
		return fmt.Errorf("couldn't save setting %q: %w", key, err)
	}
	return nil
}
