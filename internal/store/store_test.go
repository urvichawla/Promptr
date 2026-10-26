package store

import (
	"errors"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
)

func openTemp(t *testing.T) (*Store, string) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "nested", "prompts.db")
	s, err := Open(path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { s.Close() })
	return s, path
}

func mustList(t *testing.T, s *Store) []Prompt {
	t.Helper()
	prompts, err := s.ListPrompts()
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	return prompts
}

func tagCount(t *testing.T, s *Store) int {
	t.Helper()
	var n int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM tags`).Scan(&n); err != nil {
		t.Fatalf("count tags: %v", err)
	}
	return n
}

func TestSeedsSamplesOnFirstOpen(t *testing.T) {
	s, _ := openTemp(t)
	prompts := mustList(t, s)
	if len(prompts) != len(samplePrompts) {
		t.Fatalf("got %d prompts, want %d", len(prompts), len(samplePrompts))
	}
	if prompts[0].Title != samplePrompts[0].Title {
		t.Errorf("first prompt = %q, want %q", prompts[0].Title, samplePrompts[0].Title)
	}
}

func TestCreateNormalizesInput(t *testing.T) {
	s, _ := openTemp(t)
	p, err := s.CreatePrompt(PromptInput{
		Title:   "  React   hook checklist ",
		Content: "\n\nCheck this hook:\n  - deps array\n  - cleanup\n\n",
		Tags:    []string{"React", " react ", ""},
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if p.Title != "React hook checklist" {
		t.Errorf("title = %q", p.Title)
	}
	if p.Content != "Check this hook:\n  - deps array\n  - cleanup" {
		t.Errorf("content = %q", p.Content)
	}
	if want := []string{"react"}; !reflect.DeepEqual(p.Tags, want) {
		t.Errorf("tags = %v, want %v", p.Tags, want)
	}
	if p.CreatedAt == "" || p.CreatedAt != p.UpdatedAt {
		t.Errorf("timestamps = %q / %q", p.CreatedAt, p.UpdatedAt)
	}

	got := mustList(t, s)[0]
	if !reflect.DeepEqual(got, p) {
		t.Errorf("listed %+v, want %+v", got, p)
	}
}

func TestUnicodeNormalization(t *testing.T) {
	s, _ := openTemp(t)
	p, err := s.CreatePrompt(PromptInput{
		Title:   "Ébauche  de  texte",
		Content: "Corps \n　",
		Tags:    []string{"Mise en page"},
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if p.Title != "Ébauche de texte" {
		t.Errorf("title = %q", p.Title)
	}
	if p.Content != "Corps" {
		t.Errorf("content = %q", p.Content)
	}
	if want := []string{"mise-en-page"}; !reflect.DeepEqual(p.Tags, want) {
		t.Errorf("tags = %v, want %v", p.Tags, want)
	}
	if _, err := s.CreatePrompt(PromptInput{Title: "ébauche DE TEXTE", Content: "x"}); !errors.Is(err, ErrTitleTaken) {
		t.Errorf("non-ASCII duplicate title err = %v, want ErrTitleTaken", err)
	}
}

func TestValidation(t *testing.T) {
	s, _ := openTemp(t)
	cases := map[string]PromptInput{
		"empty title":   {Title: "  ", Content: "x"},
		"empty content": {Title: "x", Content: " \n "},
		"long title":    {Title: strings.Repeat("a", TitleMax+1), Content: "x"},
		"long tag":      {Title: "x", Content: "x", Tags: []string{strings.Repeat("a", TagMax+1)}},
		"two tags":      {Title: "x", Content: "x", Tags: []string{"a", "b"}},
	}
	for name, in := range cases {
		_, err := s.CreatePrompt(in)
		var vErr *ValidationError
		if !errors.As(err, &vErr) {
			t.Errorf("%s: err = %v, want ValidationError", name, err)
		}
	}
}

func TestDuplicateTitleIgnoresCase(t *testing.T) {
	s, _ := openTemp(t)
	if _, err := s.CreatePrompt(PromptInput{Title: "debug a STACK trace", Content: "x"}); !errors.Is(err, ErrTitleTaken) {
		t.Fatalf("create err = %v, want ErrTitleTaken", err)
	}

	p := mustList(t, s)[0]
	if _, err := s.UpdatePrompt(p.ID, PromptInput{Title: strings.ToUpper(p.Title), Content: p.Content}); err != nil {
		t.Fatalf("renaming a prompt to its own title in a new case should work: %v", err)
	}
}

func TestUpdateReplacesTagsAndCleansOrphans(t *testing.T) {
	s, _ := openTemp(t)
	p, err := s.CreatePrompt(PromptInput{Title: "Solo", Content: "x", Tags: []string{"only-here"}})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	before := tagCount(t, s)

	updated, err := s.UpdatePrompt(p.ID, PromptInput{Title: "Solo v2", Content: "y", Tags: []string{"backend"}})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if updated.CreatedAt != p.CreatedAt || updated.UpdatedAt < p.UpdatedAt {
		t.Errorf("timestamps not preserved/advanced: %+v vs %+v", updated, p)
	}
	if after := tagCount(t, s); after != before-1 {
		t.Errorf("tag count = %d, want %d (orphan removed, backend reused)", after, before-1)
	}
	if _, err := s.UpdatePrompt(999999, PromptInput{Title: "x", Content: "x"}); !errors.Is(err, ErrNotFound) {
		t.Errorf("update missing err = %v, want ErrNotFound", err)
	}
}

func TestDelete(t *testing.T) {
	s, _ := openTemp(t)
	p, err := s.CreatePrompt(PromptInput{Title: "Temp", Content: "x", Tags: []string{"temp-tag"}})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	before := tagCount(t, s)
	if err := s.DeletePrompt(p.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if len(mustList(t, s)) != len(samplePrompts) {
		t.Errorf("prompt not deleted")
	}
	if tagCount(t, s) != before-1 {
		t.Errorf("orphan tag not removed")
	}
	if err := s.DeletePrompt(p.ID); !errors.Is(err, ErrNotFound) {
		t.Errorf("second delete err = %v, want ErrNotFound", err)
	}
}

func TestPromptContent(t *testing.T) {
	s, _ := openTemp(t)
	body := "Line one\n\tTabbed line\n  Indented — with “quotes” and émoji 🚀\n\nLast line"
	p, err := s.CreatePrompt(PromptInput{Title: "Multiline", Content: body})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	got, err := s.PromptContent(p.ID)
	if err != nil {
		t.Fatalf("content: %v", err)
	}
	if got != body {
		t.Errorf("content = %q, want %q", got, body)
	}
	if _, err := s.PromptContent(999999); !errors.Is(err, ErrNotFound) {
		t.Errorf("missing err = %v, want ErrNotFound", err)
	}
}

func TestFavorites(t *testing.T) {
	s, _ := openTemp(t)
	prompts := mustList(t, s)
	last := prompts[len(prompts)-1]

	if err := s.SetFavorite(last.ID, true); err != nil {
		t.Fatalf("favorite: %v", err)
	}
	got := mustList(t, s)
	if got[0].ID != last.ID || !got[0].Favorite {
		t.Errorf("favorite should sort first, got %q favorite=%v", got[0].Title, got[0].Favorite)
	}
	if got[0].UpdatedAt != last.UpdatedAt {
		t.Errorf("starring changed updated_at: %q -> %q", last.UpdatedAt, got[0].UpdatedAt)
	}

	updated, err := s.UpdatePrompt(last.ID, PromptInput{Title: last.Title + " v2", Content: last.Content})
	if err != nil {
		t.Fatalf("update: %v", err)
	}
	if !updated.Favorite {
		t.Errorf("editing a favorite dropped the star")
	}

	if err := s.SetFavorite(last.ID, false); err != nil {
		t.Fatalf("unfavorite: %v", err)
	}
	if mustList(t, s)[0].Favorite {
		t.Errorf("unfavorite did not clear the star")
	}
	if err := s.SetFavorite(999999, true); !errors.Is(err, ErrNotFound) {
		t.Errorf("missing prompt err = %v, want ErrNotFound", err)
	}
}

func TestSettings(t *testing.T) {
	s, path := openTemp(t)
	if v, err := s.Setting("paste_target", "previous"); err != nil || v != "previous" {
		t.Fatalf("default = %q, %v", v, err)
	}
	if err := s.SetSetting("paste_target", "com.openai.chat"); err != nil {
		t.Fatalf("set: %v", err)
	}
	if err := s.SetSetting("paste_target", "com.anthropic.claudefordesktop"); err != nil {
		t.Fatalf("overwrite: %v", err)
	}
	s.Close()

	reopened, err := Open(path)
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	defer reopened.Close()
	if v, _ := reopened.Setting("paste_target", "previous"); v != "com.anthropic.claudefordesktop" {
		t.Errorf("after reopen = %q", v)
	}
}

func TestMigratesV1Database(t *testing.T) {
	s, path := openTemp(t)
	if _, err := s.db.Exec(`DROP TABLE settings; ALTER TABLE prompts DROP COLUMN favorite; PRAGMA user_version = 1`); err != nil {
		t.Fatalf("downgrade: %v", err)
	}
	s.Close()

	upgraded, err := Open(path)
	if err != nil {
		t.Fatalf("open v1 database: %v", err)
	}
	defer upgraded.Close()
	var version int
	upgraded.db.QueryRow(`PRAGMA user_version`).Scan(&version)
	if version != len(migrations) {
		t.Errorf("version = %d, want %d", version, len(migrations))
	}
	if len(mustList(t, upgraded)) != len(samplePrompts) {
		t.Errorf("prompts lost during migration")
	}
	if err := upgraded.SetSetting("k", "v"); err != nil {
		t.Errorf("settings table missing after upgrade: %v", err)
	}
}

func TestMigrationKeepsOneTagPerPrompt(t *testing.T) {
	s, path := openTemp(t)
	mustExec := func(query string, args ...any) {
		t.Helper()
		if _, err := s.db.Exec(query, args...); err != nil {
			t.Fatalf("%s: %v", query, err)
		}
	}
	multi, err := s.CreatePrompt(PromptInput{Title: "Multi", Content: "x", Tags: []string{"zeta"}})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	tie, err := s.CreatePrompt(PromptInput{Title: "Tie", Content: "x", Tags: []string{"mango"}})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	mustExec(`INSERT INTO tags (name) VALUES ('apple')`)
	mustExec(`INSERT INTO prompt_tags (prompt_id, tag_id) SELECT ?, id FROM tags WHERE name IN ('backend', 'apple')`, multi.ID)
	mustExec(`INSERT INTO prompt_tags (prompt_id, tag_id) SELECT ?, id FROM tags WHERE name = 'apple'`, tie.ID)
	mustExec(`PRAGMA user_version = 3`)
	s.Close()

	migrated, err := Open(path)
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	defer migrated.Close()
	tags := map[string][]string{}
	for _, p := range mustList(t, migrated) {
		if len(p.Tags) > 1 {
			t.Errorf("%q still has %v", p.Title, p.Tags)
		}
		tags[p.Title] = p.Tags
	}
	if want := []string{"backend"}; !reflect.DeepEqual(tags["Multi"], want) {
		t.Errorf("Multi kept %v, want the most used tag %v", tags["Multi"], want)
	}
	if want := []string{"apple"}; !reflect.DeepEqual(tags["Tie"], want) {
		t.Errorf("Tie kept %v, want the alphabetical tie-break %v", tags["Tie"], want)
	}
	var orphans int
	migrated.db.QueryRow(`SELECT COUNT(*) FROM tags WHERE name IN ('zeta', 'mango')`).Scan(&orphans)
	if orphans != 0 {
		t.Errorf("dropped tags should be cleaned up, %d left", orphans)
	}
}

func TestAdoptsLegacyFolder(t *testing.T) {
	support := t.TempDir()
	legacyDB := filepath.Join(support, legacyDataFolder, "prompts.db")
	s, err := Open(legacyDB)
	if err != nil {
		t.Fatalf("open legacy: %v", err)
	}
	if _, err := s.CreatePrompt(PromptInput{Title: "Old data", Content: "x"}); err != nil {
		t.Fatalf("create: %v", err)
	}
	s.Close()

	if err := adoptLegacyFolder(support); err != nil {
		t.Fatalf("adopt: %v", err)
	}
	moved, err := Open(filepath.Join(support, dataFolder, "prompts.db"))
	if err != nil {
		t.Fatalf("open moved: %v", err)
	}
	defer moved.Close()
	if mustList(t, moved)[0].Title != "Old data" {
		t.Errorf("data not carried over")
	}

	if err := os.MkdirAll(filepath.Join(support, legacyDataFolder), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := adoptLegacyFolder(support); err != nil {
		t.Fatalf("second adopt: %v", err)
	}
	if _, err := os.Stat(filepath.Join(support, legacyDataFolder)); err != nil {
		t.Errorf("must not touch a legacy folder once the new one exists: %v", err)
	}
}

func TestPersistsAcrossReopen(t *testing.T) {
	s, path := openTemp(t)
	created, err := s.CreatePrompt(PromptInput{Title: "Keep me", Content: "line 1\nline 2", Tags: []string{"persist"}})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	first := mustList(t, s)[0]
	if err := s.DeletePrompt(mustList(t, s)[1].ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	s.Close()

	reopened, err := Open(path)
	if err != nil {
		t.Fatalf("reopen: %v", err)
	}
	defer reopened.Close()

	prompts := mustList(t, reopened)
	if len(prompts) != len(samplePrompts) {
		t.Fatalf("after reopen got %d prompts, want %d (samples must not be re-seeded)", len(prompts), len(samplePrompts))
	}
	if !reflect.DeepEqual(prompts[0], first) || prompts[0].ID != created.ID {
		t.Errorf("after reopen first = %+v, want %+v", prompts[0], first)
	}
}
