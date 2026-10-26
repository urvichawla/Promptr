package main

import (
	"fmt"

	"promptr/internal/macos"
	"promptr/internal/paste"
)

const pasteTargetSetting = "paste_target"

func (a *App) GetPasteTargets() (paste.Targets, error) {
	selected := paste.PreviousTarget
	if s, err := a.db(); err == nil {
		selected, _ = s.Setting(pasteTargetSetting, paste.PreviousTarget)
	}
	return a.paste.Targets(selected), nil
}

func (a *App) SetPasteTarget(id string) error {
	if !paste.IsValidTarget(id) {
		return fmt.Errorf("unknown paste target %q", id)
	}
	s, err := a.db()
	if err != nil {
		return err
	}
	return s.SetSetting(pasteTargetSetting, id)
}

func (a *App) PasteIntoApp(id int64, targetID string) (paste.Result, error) {
	s, err := a.db()
	if err != nil {
		return paste.Result{}, err
	}
	content, err := s.PromptContent(id)
	if err != nil {
		return paste.Result{}, err
	}
	return a.paste.Paste(id, content, targetID)
}

func (a *App) GetAccessibility() bool {
	return macos.AccessibilityTrusted(false)
}

func (a *App) RequestAccessibility() bool {
	trusted := macos.AccessibilityTrusted(true)
	if !trusted {
		macos.OpenAccessibilitySettings()
	}
	return trusted
}
