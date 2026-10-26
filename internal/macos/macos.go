package macos

import "sync"

const ShortcutLabel = "⌃⌥P"

type ShortcutStatus struct {
	Label      string `json:"label"`
	Ready      bool   `json:"ready"`
	Registered bool   `json:"registered"`
	Error      string `json:"error"`
}

type Callbacks struct {
	OnWindowShown func()
	OnAddPrompt   func()
}

type System struct{}

var (
	stateMu   sync.Mutex
	callbacks Callbacks
	shortcut  = ShortcutStatus{Label: ShortcutLabel}
)

func Shortcut() ShortcutStatus {
	stateMu.Lock()
	defer stateMu.Unlock()
	return shortcut
}

func notify(pick func(Callbacks) func()) {
	stateMu.Lock()
	fn := pick(callbacks)
	stateMu.Unlock()
	if fn != nil {
		go fn()
	}
}

func (System) PreviousApp() string              { return PreviousApp() }
func (System) AppName(bundleID string) string   { return AppName(bundleID) }
func (System) AppIcon(bundleID string) string   { return AppIcon(bundleID) }
func (System) AppRunning(bundleID string) bool  { return AppRunning(bundleID) }
func (System) Activate(bundleID string) bool    { return Activate(bundleID) }
func (System) IsFrontmost(bundleID string) bool { return IsFrontmost(bundleID) }
func (System) AccessibilityTrusted() bool       { return AccessibilityTrusted(false) }
func (System) HideSelf()                        { HideAppNow() }
func (System) ShowSelf()                        { ShowWindow() }
func (System) SendPaste() bool                  { return SendPaste() }
