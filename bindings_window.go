package main

import "promptr/internal/macos"

func (a *App) HideWindow() {
	macos.HideApp()
}

func (a *App) GetShortcut() macos.ShortcutStatus {
	return macos.Shortcut()
}
