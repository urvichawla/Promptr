package paste

const PreviousTarget = "previous"

type Target struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Detail  string `json:"detail"`
	Icon    string `json:"icon"`
	Running bool   `json:"running"`
}

type Targets struct {
	Selected string   `json:"selected"`
	Targets  []Target `json:"targets"`
}

type knownApp struct {
	BundleID string
	Name     string
}

var knownApps = []knownApp{
	{"com.anthropic.claudefordesktop", "Claude"},
	{"com.openai.chat", "ChatGPT"},
	{"com.todesktop.230313mzl4w4u92", "Cursor"},
	{"com.microsoft.VSCode", "VS Code"},
	{"com.apple.Safari", "Safari"},
	{"com.google.Chrome", "Chrome"},
	{"company.thebrowser.Browser", "Arc"},
	{"com.tinyspeck.slackmacgap", "Slack"},
	{"com.apple.Notes", "Notes"},
	{"com.apple.TextEdit", "TextEdit"},
}

var terminalApps = map[string]bool{
	"com.apple.Terminal":         true,
	"com.googlecode.iterm2":      true,
	"dev.warp.Warp-Stable":       true,
	"com.mitchellh.ghostty":      true,
	"net.kovidgoyal.kitty":       true,
	"org.alacritty":              true,
	"com.github.wez.wezterm":     true,
	"co.zeit.hyper":              true,
	"com.microsoft.terminal.mac": true,
}

func IsValidTarget(id string) bool {
	return id == PreviousTarget || isKnownApp(id)
}

func isKnownApp(bundleID string) bool {
	for _, app := range knownApps {
		if app.BundleID == bundleID {
			return true
		}
	}
	return false
}

func knownName(bundleID string) string {
	for _, app := range knownApps {
		if app.BundleID == bundleID {
			return app.Name
		}
	}
	return ""
}
