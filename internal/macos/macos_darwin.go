//go:build darwin

package macos

/*
#cgo CFLAGS: -x objective-c -fobjc-arc
#cgo LDFLAGS: -framework Cocoa -framework Carbon -framework ApplicationServices
#include <stdlib.h>
#include "menubar_darwin.h"
#include "apps_darwin.h"
*/
import "C"

import (
	"fmt"
	"unsafe"
)

const hotKeyExistsErr = -9878

func Setup(cb Callbacks) {
	stateMu.Lock()
	callbacks = cb
	stateMu.Unlock()
	C.pbSetup()
}

func ShowWindow() { C.pbShowWindow() }

func HideApp() { C.pbHideApp() }

func HideAppNow() { C.pbHideAppSync() }

func PreviousApp() string { return goString(C.pbPreviousApp()) }

func AppName(bundleID string) string {
	cs := C.CString(bundleID)
	defer C.free(unsafe.Pointer(cs))
	return goString(C.pbAppName(cs))
}

func AppIcon(bundleID string) string {
	cs := C.CString(bundleID)
	defer C.free(unsafe.Pointer(cs))
	encoded := goString(C.pbAppIconPNGBase64(cs, 64))
	if encoded == "" {
		return ""
	}
	return "data:image/png;base64," + encoded
}

func AppRunning(bundleID string) bool {
	return withCString(bundleID, func(cs *C.char) C.int { return C.pbAppRunning(cs) })
}

func Activate(bundleID string) bool {
	return withCString(bundleID, func(cs *C.char) C.int { return C.pbActivateApp(cs) })
}

func IsFrontmost(bundleID string) bool {
	return withCString(bundleID, func(cs *C.char) C.int { return C.pbIsFrontmost(cs) })
}

func AccessibilityTrusted(prompt bool) bool {
	p := C.int(0)
	if prompt {
		p = 1
	}
	return C.pbAccessibilityTrusted(p) != 0
}

func OpenAccessibilitySettings() { C.pbOpenAccessibilitySettings() }

func SendPaste() bool { return C.pbSendPaste() != 0 }

func goString(value *C.char) string {
	if value == nil {
		return ""
	}
	defer C.free(unsafe.Pointer(value))
	return C.GoString(value)
}

func withCString(value string, fn func(*C.char) C.int) bool {
	cs := C.CString(value)
	defer C.free(unsafe.Pointer(cs))
	return fn(cs) != 0
}

//export goNativeReady
func goNativeReady(status C.int) {
	stateMu.Lock()
	defer stateMu.Unlock()
	shortcut.Ready = true
	shortcut.Registered = status == 0
	switch int(status) {
	case 0:
		shortcut.Error = ""
	case hotKeyExistsErr:
		shortcut.Error = fmt.Sprintf("%s is already used by another app", ShortcutLabel)
	default:
		shortcut.Error = fmt.Sprintf("macOS refused the %s shortcut (error %d)", ShortcutLabel, int(status))
	}
}

//export goWindowShown
func goWindowShown() {
	notify(func(cb Callbacks) func() { return cb.OnWindowShown })
}

//export goAddPromptRequested
func goAddPromptRequested() {
	notify(func(cb Callbacks) func() { return cb.OnAddPrompt })
}
