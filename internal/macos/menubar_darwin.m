#import <Cocoa/Cocoa.h>
#import <Carbon/Carbon.h>
#include "menubar_darwin.h"
#include "apps_darwin.h"
#include "_cgo_export.h"

static NSStatusItem *statusItem;
static EventHotKeyRef hotKeyRef;

static NSWindow *pbMainWindow(void) {
    Class wailsWindow = NSClassFromString(@"WailsWindow");
    for (NSWindow *window in NSApp.windows) {
        if (wailsWindow != nil && [window isKindOfClass:wailsWindow]) {
            return window;
        }
    }
    return nil;
}

static NSScreen *pbScreenWithMouse(void) {
    NSPoint mouse = [NSEvent mouseLocation];
    for (NSScreen *screen in NSScreen.screens) {
        if (NSMouseInRect(mouse, screen.frame, NO)) {
            return screen;
        }
    }
    return NSScreen.mainScreen;
}

static void pbShowOnMainThread(void) {
    NSWindow *window = pbMainWindow();
    if (window == nil) {
        return;
    }

    NSScreen *screen = pbScreenWithMouse();
    if (!NSIntersectsRect(window.frame, screen.visibleFrame)) {
        NSRect visible = screen.visibleFrame;
        NSSize size = window.frame.size;
        CGFloat x = NSMidX(visible) - size.width / 2;
        CGFloat y = NSMaxY(visible) - size.height - visible.size.height * 0.15;
        [window setFrameOrigin:NSMakePoint(round(x), round(MAX(NSMinY(visible), y)))];
    }

    window.collectionBehavior |= NSWindowCollectionBehaviorMoveToActiveSpace |
                                 NSWindowCollectionBehaviorFullScreenAuxiliary;
    [NSApp unhide:nil];
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
    [NSApp activateIgnoringOtherApps:YES];
#pragma clang diagnostic pop
    [window makeKeyAndOrderFront:nil];
    goWindowShown();
}

static void pbToggleOnMainThread(void) {
    NSWindow *window = pbMainWindow();
    if (window != nil && window.isVisible && window.isKeyWindow && NSApp.isActive) {
        [NSApp hide:nil];
    } else {
        pbShowOnMainThread();
    }
}

@interface PBStatusTarget : NSObject
@end

@implementation PBStatusTarget

static NSMenuItem *pbMenuItem(NSMenu *menu, NSString *title, SEL action, id target, NSString *symbol,
                               NSString *key, NSEventModifierFlags modifiers) {
    NSMenuItem *item = [menu addItemWithTitle:title action:action keyEquivalent:key];
    item.target = target;
    item.keyEquivalentModifierMask = modifiers;
    item.image = [NSImage imageWithSystemSymbolName:symbol accessibilityDescription:nil];
    return item;
}

- (void)statusItemClicked:(id)sender {
    NSMenu *menu = [[NSMenu alloc] init];
    pbMenuItem(menu, @"Open Promptr", @selector(openWindow:), self, @"magnifyingglass", @"p",
               NSEventModifierFlagControl | NSEventModifierFlagOption);
    pbMenuItem(menu, @"Add Prompt", @selector(addPrompt:), self, @"plus", @"n", NSEventModifierFlagCommand);
    [menu addItem:[NSMenuItem separatorItem]];
    pbMenuItem(menu, @"Quit Promptr", @selector(terminate:), nil, @"power", @"q", NSEventModifierFlagCommand);
    statusItem.menu = menu;
    [statusItem.button performClick:nil];
    statusItem.menu = nil;
}

- (void)openWindow:(id)sender {
    pbShowOnMainThread();
}

- (void)addPrompt:(id)sender {
    pbShowOnMainThread();
    goAddPromptRequested();
}

- (void)handleReopen:(NSAppleEventDescriptor *)event withReplyEvent:(NSAppleEventDescriptor *)reply {
    pbShowOnMainThread();
}

@end

static PBStatusTarget *statusTarget;

static OSStatus pbHotKeyPressed(EventHandlerCallRef next, EventRef event, void *userData) {
    dispatch_async(dispatch_get_main_queue(), ^{
        pbToggleOnMainThread();
    });
    return noErr;
}

void pbSetup(void) {
    dispatch_async(dispatch_get_main_queue(), ^{
        pbRememberFrontmost();
        [NSApp setActivationPolicy:NSApplicationActivationPolicyAccessory];
        NSWindow *window = pbMainWindow();
        if (window != nil && window.isVisible) {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
            [NSApp activateIgnoringOtherApps:YES];
#pragma clang diagnostic pop
            [window makeKeyAndOrderFront:nil];
        }

        statusTarget = [[PBStatusTarget alloc] init];
        statusItem = [NSStatusBar.systemStatusBar statusItemWithLength:NSSquareStatusItemLength];
        NSImage *icon = [NSImage imageWithSystemSymbolName:@"p.square" accessibilityDescription:@"Promptr"];
        icon.template = YES;
        statusItem.button.image = icon;
        statusItem.button.toolTip = @"Promptr (⌃⌥P)";
        statusItem.button.target = statusTarget;
        statusItem.button.action = @selector(statusItemClicked:);
        [statusItem.button sendActionOn:NSEventMaskLeftMouseUp | NSEventMaskRightMouseUp];

        [NSAppleEventManager.sharedAppleEventManager setEventHandler:statusTarget
                                                         andSelector:@selector(handleReopen:withReplyEvent:)
                                                       forEventClass:kCoreEventClass
                                                          andEventID:kAEReopenApplication];

        EventTypeSpec spec = {kEventClassKeyboard, kEventHotKeyPressed};
        OSStatus status = InstallApplicationEventHandler(&pbHotKeyPressed, 1, &spec, NULL, NULL);
        if (status == noErr) {
            EventHotKeyID hotKeyID = {'PBar', 1};
            status = RegisterEventHotKey(kVK_ANSI_P, controlKey | optionKey, hotKeyID,
                                         GetApplicationEventTarget(), 0, &hotKeyRef);
        }
        goNativeReady((int)status);
    });
}

void pbShowWindow(void) {
    dispatch_async(dispatch_get_main_queue(), ^{
        pbShowOnMainThread();
    });
}

void pbHideApp(void) {
    dispatch_async(dispatch_get_main_queue(), ^{
        [NSApp hide:nil];
    });
}
