package paste

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"promptr/internal/applog"
)

const (
	StatusPasted          = "pasted"
	StatusCopied          = "copied"
	StatusNeedsPermission = "needs_permission"
)

type Result struct {
	Status  string `json:"status"`
	Target  string `json:"target"`
	Message string `json:"message"`
}

type System interface {
	PreviousApp() string
	AppName(bundleID string) string
	AppIcon(bundleID string) string
	AppRunning(bundleID string) bool
	Activate(bundleID string) bool
	IsFrontmost(bundleID string) bool
	AccessibilityTrusted() bool
	HideSelf()
	ShowSelf()
	SendPaste() bool
}

type Clipboard interface {
	Copy(text string) error
}

type Service struct {
	sys             System
	clipboard       Clipboard
	log             applog.Logger
	sleep           func(time.Duration)
	activateTimeout time.Duration
	pollInterval    time.Duration
	settleDelay     time.Duration

	iconMu    sync.Mutex
	iconCache map[string]string
}

func NewService(sys System, clipboard Clipboard, log applog.Logger) *Service {
	if log == nil {
		log = applog.Discard
	}
	return &Service{
		sys:             sys,
		clipboard:       clipboard,
		log:             log,
		sleep:           time.Sleep,
		activateTimeout: 1500 * time.Millisecond,
		pollInterval:    50 * time.Millisecond,
		settleDelay:     300 * time.Millisecond,
		iconCache:       map[string]string{},
	}
}

func (s *Service) Targets(selected string) Targets {
	previous := s.sys.PreviousApp()
	targets := []Target{{
		ID:      PreviousTarget,
		Name:    "Previous app",
		Detail:  s.displayName(previous),
		Icon:    s.icon(previous),
		Running: previous != "",
	}}
	for _, app := range knownApps {
		if app.BundleID == previous || s.sys.AppName(app.BundleID) == "" {
			continue
		}
		targets = append(targets, Target{
			ID:      app.BundleID,
			Name:    app.Name,
			Icon:    s.icon(app.BundleID),
			Running: s.sys.AppRunning(app.BundleID),
		})
	}

	result := Targets{Selected: PreviousTarget, Targets: targets}
	for _, t := range targets {
		if t.ID == selected {
			result.Selected = selected
		}
	}
	return result
}

func (s *Service) Paste(promptID int64, content, targetID string) (Result, error) {
	if !IsValidTarget(targetID) {
		return Result{}, fmt.Errorf("unknown paste target %q", targetID)
	}
	bundleID := targetID
	if targetID == PreviousTarget {
		bundleID = s.sys.PreviousApp()
	}

	if err := s.clipboard.Copy(content); err != nil {
		return Result{}, err
	}
	s.log("paste prompt=%d target=%s app=%q", promptID, targetID, bundleID)

	if bundleID == "" {
		s.log("  stop: no previous app")
		return copied("", "No previous app yet. The prompt is copied — next time open Promptr with ⌃⌥P from the app you want to paste into."), nil
	}
	name := s.displayName(bundleID)

	if terminalApps[bundleID] && strings.Contains(content, "\n") {
		s.log("  stop: multi-line prompt into terminal")
		return copied(name, fmt.Sprintf("Not auto-pasting into %s: each line of a multi-line prompt could run as a command. The prompt is copied — press ⌘V there if you're sure.", name)), nil
	}
	if !s.sys.AppRunning(bundleID) {
		s.log("  stop: %s not running", bundleID)
		return copied(name, fmt.Sprintf("%s isn't open. The prompt is copied — open %s and press ⌘V.", name, name)), nil
	}
	trusted := s.sys.AccessibilityTrusted()
	s.log("  accessibility trusted=%v", trusted)
	if !trusted {
		return Result{
			Status:  StatusNeedsPermission,
			Target:  name,
			Message: fmt.Sprintf("The prompt is copied. To paste into %s automatically, allow Promptr in Accessibility settings.", name),
		}, nil
	}

	activated := s.sys.Activate(bundleID)
	frontmost := activated && s.waitFrontmost(bundleID)
	s.log("  activate=%v frontmost=%v", activated, frontmost)
	if !frontmost {
		return s.failed(name, fmt.Sprintf("Couldn't switch to %s. The prompt is copied — press ⌘V in %s.", name, name)), nil
	}

	s.sys.HideSelf()
	s.sleep(s.settleDelay)
	if !s.sys.IsFrontmost(bundleID) {
		s.log("  stop: %s lost focus after hiding Promptr", bundleID)
		return s.failed(name, fmt.Sprintf("%s lost focus before pasting. The prompt is copied — press ⌘V in %s.", name, name)), nil
	}
	if !s.sys.SendPaste() {
		s.log("  stop: could not create the keystroke events")
		return s.failed(name, fmt.Sprintf("macOS refused the paste keystroke. The prompt is copied — press ⌘V in %s.", name)), nil
	}
	s.log("  sent ⌘V to %s", bundleID)
	return Result{Status: StatusPasted, Target: name}, nil
}

func (s *Service) failed(name, message string) Result {
	s.sys.ShowSelf()
	return copied(name, message)
}

func copied(name, message string) Result {
	return Result{Status: StatusCopied, Target: name, Message: message}
}

func (s *Service) waitFrontmost(bundleID string) bool {
	for waited := time.Duration(0); waited < s.activateTimeout; waited += s.pollInterval {
		if s.sys.IsFrontmost(bundleID) {
			return true
		}
		s.sleep(s.pollInterval)
	}
	return s.sys.IsFrontmost(bundleID)
}

func (s *Service) displayName(bundleID string) string {
	if bundleID == "" {
		return ""
	}
	if name := knownName(bundleID); name != "" {
		return name
	}
	if name := s.sys.AppName(bundleID); name != "" {
		return name
	}
	return bundleID
}

func (s *Service) icon(bundleID string) string {
	if bundleID == "" {
		return ""
	}
	s.iconMu.Lock()
	defer s.iconMu.Unlock()
	if icon, ok := s.iconCache[bundleID]; ok {
		return icon
	}
	icon := s.sys.AppIcon(bundleID)
	s.iconCache[bundleID] = icon
	return icon
}
