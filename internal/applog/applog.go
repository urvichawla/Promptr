package applog

import (
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"
)

const maxBytes = 256 * 1024

type Logger func(format string, args ...any)

func Discard(string, ...any) {}

func DefaultPath(name string) string {
	home, err := os.UserHomeDir()
	if err != nil {
		return ""
	}
	return filepath.Join(home, "Library", "Logs", "Promptr", name)
}

func File(path string) Logger {
	if path == "" {
		return Discard
	}
	var mu sync.Mutex
	return func(format string, args ...any) {
		mu.Lock()
		defer mu.Unlock()
		if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
			return
		}
		if info, err := os.Stat(path); err == nil && info.Size() > maxBytes {
			os.Remove(path)
		}
		f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0o644)
		if err != nil {
			return
		}
		defer f.Close()
		fmt.Fprintf(f, "%s %s\n", time.Now().Format("2006-01-02 15:04:05.000"), fmt.Sprintf(format, args...))
	}
}
