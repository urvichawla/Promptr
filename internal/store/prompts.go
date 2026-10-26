package store

import (
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"sort"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

const (
	TitleMax         = 100
	ContentMax       = 20000
	TagMax           = 24
	TagsPerPromptMax = 1
	timeLayout       = "2006-01-02T15:04:05.000Z07:00"
)

var (
	ErrNotFound   = errors.New("this prompt no longer exists")
	ErrTitleTaken = errors.New("another prompt already has this title")
	leadingBlanks = regexp.MustCompile(`^(?:[ \t]*\n)+`)
)

type Prompt struct {
	ID        int64    `json:"id"`
	Title     string   `json:"title"`
	Content   string   `json:"content"`
	Tags      []string `json:"tags"`
	Favorite  bool     `json:"favorite"`
	CreatedAt string   `json:"createdAt"`
	UpdatedAt string   `json:"updatedAt"`
}

type PromptInput struct {
	Title   string   `json:"title"`
	Content string   `json:"content"`
	Tags    []string `json:"tags"`
}

type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

func now() string {
	return time.Now().UTC().Format(timeLayout)
}

func NormalizeTag(raw string) string {
	return strings.Join(strings.Fields(strings.ToLower(raw)), "-")
}

func normalizeInput(in PromptInput) PromptInput {
	seen := map[string]bool{}
	tags := []string{}
	for _, raw := range in.Tags {
		tag := NormalizeTag(raw)
		if tag != "" && !seen[tag] {
			seen[tag] = true
			tags = append(tags, tag)
		}
	}
	sort.Strings(tags)

	content := leadingBlanks.ReplaceAllString(in.Content, "")
	content = strings.TrimRightFunc(content, unicode.IsSpace)

	return PromptInput{
		Title:   strings.Join(strings.Fields(in.Title), " "),
		Content: content,
		Tags:    tags,
	}
}

func validate(in PromptInput) error {
	switch {
	case in.Title == "":
		return &ValidationError{"Give the prompt a title."}
	case utf8.RuneCountInString(in.Title) > TitleMax:
		return &ValidationError{fmt.Sprintf("Keep the title under %d characters.", TitleMax)}
	case in.Content == "":
		return &ValidationError{"The prompt can't be empty."}
	case utf8.RuneCountInString(in.Content) > ContentMax:
		return &ValidationError{fmt.Sprintf("Prompts are limited to %d characters.", ContentMax)}
	case len(in.Tags) > TagsPerPromptMax:
		return &ValidationError{"A prompt can have only one tag."}
	}
	for _, tag := range in.Tags {
		if utf8.RuneCountInString(tag) > TagMax {
			return &ValidationError{fmt.Sprintf("Each tag can be at most %d characters.", TagMax)}
		}
	}
	return nil
}

func (s *Store) ListPrompts() ([]Prompt, error) {
	rows, err := s.db.Query(`
		SELECT id, title, content, favorite, created_at, updated_at
		FROM prompts
		ORDER BY favorite DESC, updated_at DESC, id DESC`)
	if err != nil {
		return nil, fmt.Errorf("load prompts: %w", err)
	}
	defer rows.Close()

	prompts := []Prompt{}
	index := map[int64]int{}
	for rows.Next() {
		p := Prompt{Tags: []string{}}
		if err := rows.Scan(&p.ID, &p.Title, &p.Content, &p.Favorite, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("read prompt: %w", err)
		}
		index[p.ID] = len(prompts)
		prompts = append(prompts, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("load prompts: %w", err)
	}

	tagRows, err := s.db.Query(`
		SELECT pt.prompt_id, t.name
		FROM prompt_tags pt JOIN tags t ON t.id = pt.tag_id
		ORDER BY t.name`)
	if err != nil {
		return nil, fmt.Errorf("load tags: %w", err)
	}
	defer tagRows.Close()

	for tagRows.Next() {
		var promptID int64
		var name string
		if err := tagRows.Scan(&promptID, &name); err != nil {
			return nil, fmt.Errorf("read tag: %w", err)
		}
		if i, ok := index[promptID]; ok {
			prompts[i].Tags = append(prompts[i].Tags, name)
		}
	}
	if err := tagRows.Err(); err != nil {
		return nil, fmt.Errorf("load tags: %w", err)
	}
	return prompts, nil
}

func (s *Store) PromptContent(id int64) (string, error) {
	var content string
	err := s.db.QueryRow(`SELECT content FROM prompts WHERE id = ?`, id).Scan(&content)
	if errors.Is(err, sql.ErrNoRows) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", fmt.Errorf("couldn't load the prompt: %w", err)
	}
	return content, nil
}

func (s *Store) CreatePrompt(input PromptInput) (Prompt, error) {
	in := normalizeInput(input)
	if err := validate(in); err != nil {
		return Prompt{}, err
	}

	var created Prompt
	err := s.inTx(func(tx *sql.Tx) error {
		if err := ensureTitleFree(tx, in.Title, 0); err != nil {
			return err
		}
		p, err := insertPrompt(tx, in, now())
		created = p
		return err
	})
	if err != nil {
		return Prompt{}, wrap("save the prompt", err)
	}
	return created, nil
}

func (s *Store) UpdatePrompt(id int64, input PromptInput) (Prompt, error) {
	in := normalizeInput(input)
	if err := validate(in); err != nil {
		return Prompt{}, err
	}

	var updated Prompt
	err := s.inTx(func(tx *sql.Tx) error {
		if err := ensureTitleFree(tx, in.Title, id); err != nil {
			return err
		}
		ts := now()
		res, err := tx.Exec(`UPDATE prompts SET title = ?, content = ?, updated_at = ? WHERE id = ?`,
			in.Title, in.Content, ts, id)
		if err != nil {
			return err
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return ErrNotFound
		}
		if _, err := tx.Exec(`DELETE FROM prompt_tags WHERE prompt_id = ?`, id); err != nil {
			return err
		}
		if err := attachTags(tx, id, in.Tags); err != nil {
			return err
		}
		if err := deleteOrphanTags(tx); err != nil {
			return err
		}
		updated = Prompt{ID: id, Title: in.Title, Content: in.Content, Tags: in.Tags, UpdatedAt: ts}
		return tx.QueryRow(`SELECT created_at, favorite FROM prompts WHERE id = ?`, id).Scan(&updated.CreatedAt, &updated.Favorite)
	})
	if err != nil {
		return Prompt{}, wrap("save the prompt", err)
	}
	return updated, nil
}

func (s *Store) SetFavorite(id int64, favorite bool) error {
	res, err := s.db.Exec(`UPDATE prompts SET favorite = ? WHERE id = ?`, favorite, id)
	if err != nil {
		return fmt.Errorf("couldn't update the favorite: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Store) DeletePrompt(id int64) error {
	err := s.inTx(func(tx *sql.Tx) error {
		res, err := tx.Exec(`DELETE FROM prompts WHERE id = ?`, id)
		if err != nil {
			return err
		}
		if n, _ := res.RowsAffected(); n == 0 {
			return ErrNotFound
		}
		return deleteOrphanTags(tx)
	})
	return wrap("delete the prompt", err)
}

func (s *Store) inTx(fn func(tx *sql.Tx) error) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit()
}

func wrap(action string, err error) error {
	var vErr *ValidationError
	if err == nil || errors.As(err, &vErr) || errors.Is(err, ErrNotFound) || errors.Is(err, ErrTitleTaken) {
		return err
	}
	return fmt.Errorf("couldn't %s: %w", action, err)
}

func ensureTitleFree(tx *sql.Tx, title string, exceptID int64) error {
	rows, err := tx.Query(`SELECT title FROM prompts WHERE id != ?`, exceptID)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var existing string
		if err := rows.Scan(&existing); err != nil {
			return err
		}
		if strings.EqualFold(existing, title) {
			return ErrTitleTaken
		}
	}
	return rows.Err()
}

func insertPrompt(tx *sql.Tx, in PromptInput, ts string) (Prompt, error) {
	res, err := tx.Exec(`INSERT INTO prompts (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)`,
		in.Title, in.Content, ts, ts)
	if err != nil {
		return Prompt{}, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return Prompt{}, err
	}
	if err := attachTags(tx, id, in.Tags); err != nil {
		return Prompt{}, err
	}
	return Prompt{ID: id, Title: in.Title, Content: in.Content, Tags: in.Tags, CreatedAt: ts, UpdatedAt: ts}, nil
}

func attachTags(tx *sql.Tx, promptID int64, tags []string) error {
	for _, tag := range tags {
		if _, err := tx.Exec(`INSERT INTO tags (name) VALUES (?) ON CONFLICT (name) DO NOTHING`, tag); err != nil {
			return err
		}
		if _, err := tx.Exec(`
			INSERT INTO prompt_tags (prompt_id, tag_id)
			SELECT ?, id FROM tags WHERE name = ?`, promptID, tag); err != nil {
			return err
		}
	}
	return nil
}

func deleteOrphanTags(tx *sql.Tx) error {
	_, err := tx.Exec(`DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM prompt_tags)`)
	return err
}
