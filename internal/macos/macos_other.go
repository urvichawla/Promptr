//go:build !darwin

package macos

func Setup(cb Callbacks) {
	stateMu.Lock()
	defer stateMu.Unlock()
	callbacks = cb
	shortcut = ShortcutStatus{Label: ShortcutLabel, Ready: true, Error: "the global shortcut is only available on macOS"}
}

func ShowWindow()                           {}
func HideApp()                              {}
func HideAppNow()                           {}
func PreviousApp() string                   { return "" }
func AppName(bundleID string) string        { return "" }
func AppIcon(bundleID string) string        { return "" }
func AppRunning(bundleID string) bool       { return false }
func Activate(bundleID string) bool         { return false }
func IsFrontmost(bundleID string) bool      { return false }
func AccessibilityTrusted(prompt bool) bool { return false }
func OpenAccessibilitySettings()            {}
func SendPaste() bool                       { return false }
