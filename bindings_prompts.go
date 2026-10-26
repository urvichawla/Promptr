package main

import "promptr/internal/store"

func (a *App) ListPrompts() ([]store.Prompt, error) {
	s, err := a.db()
	if err != nil {
		return nil, err
	}
	return s.ListPrompts()
}

func (a *App) CreatePrompt(input store.PromptInput) (store.Prompt, error) {
	s, err := a.db()
	if err != nil {
		return store.Prompt{}, err
	}
	return s.CreatePrompt(input)
}

func (a *App) UpdatePrompt(id int64, input store.PromptInput) (store.Prompt, error) {
	s, err := a.db()
	if err != nil {
		return store.Prompt{}, err
	}
	return s.UpdatePrompt(id, input)
}

func (a *App) DeletePrompt(id int64) error {
	s, err := a.db()
	if err != nil {
		return err
	}
	return s.DeletePrompt(id)
}

func (a *App) SetFavorite(id int64, favorite bool) error {
	s, err := a.db()
	if err != nil {
		return err
	}
	return s.SetFavorite(id, favorite)
}

func (a *App) CopyPrompt(id int64) error {
	s, err := a.db()
	if err != nil {
		return err
	}
	content, err := s.PromptContent(id)
	if err != nil {
		return err
	}
	return a.clipboard.Copy(content)
}
