package store

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

type Store struct {
	db   *sql.DB
	path string
}

const (
	dataFolder       = "Promptr"
	legacyDataFolder = "PromptBar"
)

func DefaultPath() (string, error) {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("find application support folder: %w", err)
	}
	if err := adoptLegacyFolder(dir); err != nil {
		return "", err
	}
	return filepath.Join(dir, dataFolder, "prompts.db"), nil
}

func adoptLegacyFolder(supportDir string) error {
	current := filepath.Join(supportDir, dataFolder)
	legacy := filepath.Join(supportDir, legacyDataFolder)
	if _, err := os.Stat(current); err == nil || !os.IsNotExist(err) {
		return nil
	}
	if info, err := os.Stat(legacy); err != nil || !info.IsDir() {
		return nil
	}
	if err := os.Rename(legacy, current); err != nil {
		return fmt.Errorf("move data from %s to %s: %w", legacy, current, err)
	}
	return nil
}

func Open(path string) (*Store, error) {
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return nil, fmt.Errorf("create data folder: %w", err)
	}

	dsn := path + "?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)"
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	db.SetMaxOpenConns(1)

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("open database: %w", err)
	}

	s := &Store{db: db, path: path}
	if err := s.migrate(); err != nil {
		db.Close()
		return nil, err
	}
	return s, nil
}

func (s *Store) Path() string {
	return s.path
}

func (s *Store) Close() error {
	return s.db.Close()
}
