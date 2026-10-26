package main

import (
	"context"
	"fmt"
	"sync"

	"promptr/internal/applog"
	"promptr/internal/clipboard"
	"promptr/internal/macos"
	"promptr/internal/paste"
	"promptr/internal/store"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	eventWindowShown = "window:shown"
	eventAddPrompt   = "prompt:new"
)

type App struct {
	ctx       context.Context
	clipboard clipboard.Verified
	paste     *paste.Service

	mu      sync.Mutex
	store   *store.Store
	openErr error
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.clipboard = clipboard.Verified{
		Set: func(text string) error { return runtime.ClipboardSetText(ctx, text) },
		Get: func() (string, error) { return runtime.ClipboardGetText(ctx) },
	}
	a.paste = paste.NewService(macos.System{}, a.clipboard, applog.File(applog.DefaultPath("paste.log")))

	macos.Setup(macos.Callbacks{
		OnWindowShown: func() { runtime.EventsEmit(ctx, eventWindowShown) },
		OnAddPrompt:   func() { runtime.EventsEmit(ctx, eventAddPrompt) },
	})

	if s, err := a.db(); err == nil {
		runtime.LogInfof(ctx, "database: %s", s.Path())
	}
}

func (a *App) shutdown(context.Context) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.store != nil {
		a.store.Close()
		a.store = nil
	}
}

func (a *App) db() (*store.Store, error) {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.store != nil {
		return a.store, nil
	}

	path, err := store.DefaultPath()
	if err == nil {
		a.store, err = store.Open(path)
	}
	if err != nil {
		if a.openErr == nil || a.openErr.Error() != err.Error() {
			runtime.LogErrorf(a.ctx, "database unavailable: %v", err)
		}
		a.openErr = err
		return nil, fmt.Errorf("couldn't open the prompt database: %w", err)
	}
	a.openErr = nil
	return a.store, nil
}
