package paste

import (
	"errors"
	"reflect"
	"strings"
	"testing"
	"time"
)

const (
	claude = "com.anthropic.claudefordesktop"
	notes  = "com.apple.Notes"
	arc    = "company.thebrowser.Browser"
)

type fakeSystem struct {
	previous      string
	installed     map[string]string
	running       map[string]bool
	trusted       bool
	activateFails bool
	frontAfter    int
	losesFocus    bool
	pasteFails    bool

	front   string
	checks  int
	actions []string
}

func newFakeSystem() *fakeSystem {
	return &fakeSystem{
		previous:  claude,
		installed: map[string]string{claude: "Claude", notes: "Notes"},
		running:   map[string]bool{claude: true, notes: true},
		trusted:   true,
	}
}

func (f *fakeSystem) PreviousApp() string             { return f.previous }
func (f *fakeSystem) AppName(bundleID string) string  { return f.installed[bundleID] }
func (f *fakeSystem) AppIcon(bundleID string) string  { return "icon:" + bundleID }
func (f *fakeSystem) AppRunning(bundleID string) bool { return f.running[bundleID] }
func (f *fakeSystem) AccessibilityTrusted() bool      { return f.trusted }
func (f *fakeSystem) ShowSelf()                       { f.actions = append(f.actions, "show") }

func (f *fakeSystem) Activate(bundleID string) bool {
	f.actions = append(f.actions, "activate "+bundleID)
	if f.activateFails {
		return false
	}
	f.front = bundleID
	return true
}

func (f *fakeSystem) IsFrontmost(bundleID string) bool {
	f.checks++
	if f.checks <= f.frontAfter {
		return false
	}
	return f.front == bundleID
}

func (f *fakeSystem) HideSelf() {
	f.actions = append(f.actions, "hide")
	if f.losesFocus {
		f.front = "somewhere-else"
	}
}

func (f *fakeSystem) SendPaste() bool {
	f.actions = append(f.actions, "⌘V")
	return !f.pasteFails
}

type fakeClipboard struct {
	text string
	err  error
}

func (c *fakeClipboard) Copy(text string) error {
	if c.err != nil {
		return c.err
	}
	c.text = text
	return nil
}

func newTestService(sys *fakeSystem, clip *fakeClipboard) *Service {
	s := NewService(sys, clip, nil)
	s.sleep = func(time.Duration) {}
	return s
}

func TestPastesIntoPreviousApp(t *testing.T) {
	sys, clip := newFakeSystem(), &fakeClipboard{}
	got, err := newTestService(sys, clip).Paste(1, "hello", PreviousTarget)
	if err != nil {
		t.Fatalf("paste: %v", err)
	}
	if got.Status != StatusPasted || got.Target != "Claude" {
		t.Errorf("result = %+v", got)
	}
	if clip.text != "hello" {
		t.Errorf("clipboard = %q", clip.text)
	}
	if want := []string{"activate " + claude, "hide", "⌘V"}; !reflect.DeepEqual(sys.actions, want) {
		t.Errorf("actions = %v, want %v", sys.actions, want)
	}
}

func TestWaitsForTargetToBecomeFrontmost(t *testing.T) {
	sys := newFakeSystem()
	sys.frontAfter = 3
	got, _ := newTestService(sys, &fakeClipboard{}).Paste(1, "hello", notes)
	if got.Status != StatusPasted {
		t.Errorf("status = %q, want pasted after waiting", got.Status)
	}
}

func TestStopsBeforeSwitchingApps(t *testing.T) {
	cases := map[string]struct {
		setup   func(*fakeSystem)
		target  string
		content string
		status  string
		message string
	}{
		"no previous app":        {func(f *fakeSystem) { f.previous = "" }, PreviousTarget, "x", StatusCopied, "No previous app"},
		"target not running":     {func(f *fakeSystem) { f.running[notes] = false }, notes, "x", StatusCopied, "Notes isn't open"},
		"no accessibility":       {func(f *fakeSystem) { f.trusted = false }, notes, "x", StatusNeedsPermission, "allow Promptr"},
		"multi-line to terminal": {func(f *fakeSystem) { f.previous = "com.apple.Terminal"; f.running["com.apple.Terminal"] = true }, PreviousTarget, "rm -rf\nls", StatusCopied, "could run as a command"},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			sys, clip := newFakeSystem(), &fakeClipboard{}
			tc.setup(sys)
			got, err := newTestService(sys, clip).Paste(1, tc.content, tc.target)
			if err != nil {
				t.Fatalf("paste: %v", err)
			}
			if got.Status != tc.status || !strings.Contains(got.Message, tc.message) {
				t.Errorf("result = %+v, want %s containing %q", got, tc.status, tc.message)
			}
			if len(sys.actions) != 0 {
				t.Errorf("should not touch other apps, did %v", sys.actions)
			}
			if clip.text != tc.content {
				t.Errorf("prompt should still be copied, clipboard = %q", clip.text)
			}
		})
	}
}

func TestComesBackWhenPasteCannotFinish(t *testing.T) {
	cases := map[string]struct {
		setup   func(*fakeSystem)
		message string
		actions []string
	}{
		"activation fails":  {func(f *fakeSystem) { f.activateFails = true }, "Couldn't switch", []string{"activate " + notes, "show"}},
		"never frontmost":   {func(f *fakeSystem) { f.frontAfter = 1000 }, "Couldn't switch", []string{"activate " + notes, "show"}},
		"loses focus":       {func(f *fakeSystem) { f.losesFocus = true }, "lost focus", []string{"activate " + notes, "hide", "show"}},
		"keystroke refused": {func(f *fakeSystem) { f.pasteFails = true }, "refused", []string{"activate " + notes, "hide", "⌘V", "show"}},
	}
	for name, tc := range cases {
		t.Run(name, func(t *testing.T) {
			sys := newFakeSystem()
			tc.setup(sys)
			got, err := newTestService(sys, &fakeClipboard{}).Paste(1, "x", notes)
			if err != nil {
				t.Fatalf("paste: %v", err)
			}
			if got.Status != StatusCopied || !strings.Contains(got.Message, tc.message) {
				t.Errorf("result = %+v, want copied containing %q", got, tc.message)
			}
			if !reflect.DeepEqual(sys.actions, tc.actions) {
				t.Errorf("actions = %v, want %v", sys.actions, tc.actions)
			}
		})
	}
}

func TestRejectsUnknownTargetAndClipboardFailure(t *testing.T) {
	sys := newFakeSystem()
	if _, err := newTestService(sys, &fakeClipboard{}).Paste(1, "x", "com.evil.app"); err == nil {
		t.Error("unknown target should be rejected")
	}
	boom := errors.New("pbcopy failed")
	if _, err := newTestService(sys, &fakeClipboard{err: boom}).Paste(1, "x", notes); !errors.Is(err, boom) {
		t.Errorf("err = %v, want clipboard error", err)
	}
	if len(sys.actions) != 0 {
		t.Errorf("nothing should happen after a failed copy, did %v", sys.actions)
	}
}

func TestTargetsListPreviousAppFirstWithoutDuplicates(t *testing.T) {
	sys := newFakeSystem()
	got := newTestService(sys, &fakeClipboard{}).Targets(notes)

	var ids []string
	for _, target := range got.Targets {
		ids = append(ids, target.ID)
	}
	if want := []string{PreviousTarget, notes}; !reflect.DeepEqual(ids, want) {
		t.Errorf("targets = %v, want %v (installed apps only, previous app not repeated)", ids, want)
	}
	if got.Targets[0].Detail != "Claude" || got.Targets[0].Icon != "icon:"+claude {
		t.Errorf("previous target = %+v", got.Targets[0])
	}
	if got.Selected != notes {
		t.Errorf("selected = %q", got.Selected)
	}
	if fallback := newTestService(sys, &fakeClipboard{}).Targets(arc).Selected; fallback != PreviousTarget {
		t.Errorf("uninstalled selection should fall back to previous, got %q", fallback)
	}
}
