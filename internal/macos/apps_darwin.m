#import <Cocoa/Cocoa.h>
#import <Carbon/Carbon.h>
#import <ApplicationServices/ApplicationServices.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include "apps_darwin.h"

static NSString *previousBundleID;

static void pbOnMainSync(dispatch_block_t block) {
    if (NSThread.isMainThread) {
        block();
    } else {
        dispatch_sync(dispatch_get_main_queue(), block);
    }
}

static char *pbCopyString(NSString *value) {
    return value == nil ? NULL : strdup(value.UTF8String);
}

static NSRunningApplication *pbRunningApp(NSString *bundleID) {
    return [NSRunningApplication runningApplicationsWithBundleIdentifier:bundleID].firstObject;
}

static void pbRemember(NSRunningApplication *app) {
    if (app != nil && app.processIdentifier != NSProcessInfo.processInfo.processIdentifier &&
        app.bundleIdentifier != nil) {
        previousBundleID = app.bundleIdentifier;
    }
}

void pbRememberFrontmost(void) {
    static BOOL observing = NO;
    pbRemember(NSWorkspace.sharedWorkspace.frontmostApplication);
    if (observing) {
        return;
    }
    observing = YES;
    [NSWorkspace.sharedWorkspace.notificationCenter
        addObserverForName:NSWorkspaceDidActivateApplicationNotification
                    object:nil
                     queue:NSOperationQueue.mainQueue
                usingBlock:^(NSNotification *note) {
                    pbRemember(note.userInfo[NSWorkspaceApplicationKey]);
                }];
}

char *pbPreviousApp(void) {
    __block char *result = NULL;
    pbOnMainSync(^{
        result = pbCopyString(previousBundleID);
    });
    return result;
}

char *pbAppName(const char *bundleID) {
    NSString *identifier = [NSString stringWithUTF8String:bundleID];
    NSURL *url = [NSWorkspace.sharedWorkspace URLForApplicationWithBundleIdentifier:identifier];
    if (url == nil) {
        return NULL;
    }
    NSString *name = [NSFileManager.defaultManager displayNameAtPath:url.path];
    if ([name hasSuffix:@".app"]) {
        name = [name substringToIndex:name.length - 4];
    }
    return pbCopyString(name);
}

char *pbAppIconPNGBase64(const char *bundleID, int size) {
    NSString *identifier = [NSString stringWithUTF8String:bundleID];
    __block char *result = NULL;
    pbOnMainSync(^{
        NSURL *url = [NSWorkspace.sharedWorkspace URLForApplicationWithBundleIdentifier:identifier];
        if (url == nil) {
            return;
        }
        NSImage *icon = [NSWorkspace.sharedWorkspace iconForFile:url.path];
        NSBitmapImageRep *rep = [[NSBitmapImageRep alloc] initWithBitmapDataPlanes:NULL
                                                                        pixelsWide:size
                                                                        pixelsHigh:size
                                                                     bitsPerSample:8
                                                                   samplesPerPixel:4
                                                                          hasAlpha:YES
                                                                          isPlanar:NO
                                                                    colorSpaceName:NSCalibratedRGBColorSpace
                                                                       bytesPerRow:0
                                                                      bitsPerPixel:0];
        [NSGraphicsContext saveGraphicsState];
        NSGraphicsContext.currentContext = [NSGraphicsContext graphicsContextWithBitmapImageRep:rep];
        [icon drawInRect:NSMakeRect(0, 0, size, size)];
        [NSGraphicsContext restoreGraphicsState];
        NSData *png = [rep representationUsingType:NSBitmapImageFileTypePNG properties:@{}];
        result = pbCopyString([png base64EncodedStringWithOptions:0]);
    });
    return result;
}

int pbAppRunning(const char *bundleID) {
    return pbRunningApp([NSString stringWithUTF8String:bundleID]) != nil;
}

int pbActivateApp(const char *bundleID) {
    NSString *identifier = [NSString stringWithUTF8String:bundleID];
    __block int ok = 0;
    pbOnMainSync(^{
        NSRunningApplication *app = pbRunningApp(identifier);
        if (app == nil) {
            return;
        }
        if (@available(macOS 14.0, *)) {
            [NSApp yieldActivationToApplication:app];
        }
        [app unhide];
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
        ok = [app activateWithOptions:NSApplicationActivateAllWindows | NSApplicationActivateIgnoringOtherApps];
#pragma clang diagnostic pop
    });
    return ok;
}

int pbIsFrontmost(const char *bundleID) {
    NSString *identifier = [NSString stringWithUTF8String:bundleID];
    __block int front = 0;
    pbOnMainSync(^{
        front = [NSWorkspace.sharedWorkspace.frontmostApplication.bundleIdentifier isEqualToString:identifier];
    });
    return front;
}

int pbAccessibilityTrusted(int prompt) {
    NSDictionary *options = @{(__bridge NSString *)kAXTrustedCheckOptionPrompt: @(prompt != 0)};
    return AXIsProcessTrustedWithOptions((__bridge CFDictionaryRef)options);
}

void pbOpenAccessibilitySettings(void) {
    dispatch_async(dispatch_get_main_queue(), ^{
        NSURL *url = [NSURL URLWithString:@"x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"];
        [NSWorkspace.sharedWorkspace openURL:url];
    });
}

void pbHideAppSync(void) {
    pbOnMainSync(^{
        [NSApp hide:nil];
    });
}

static CGKeyCode pbKeyCodeForV(void) {
    CGKeyCode result = kVK_ANSI_V;
    TISInputSourceRef source = TISCopyCurrentKeyboardLayoutInputSource();
    if (source == NULL) {
        return result;
    }
    CFDataRef data = TISGetInputSourceProperty(source, kTISPropertyUnicodeKeyLayoutData);
    if (data != NULL) {
        const UCKeyboardLayout *layout = (const UCKeyboardLayout *)CFDataGetBytePtr(data);
        UInt32 modifiers = (cmdKey >> 8) & 0xFF;
        for (CGKeyCode code = 0; code < 128; code++) {
            UInt32 deadKeys = 0;
            UniChar chars[4];
            UniCharCount length = 0;
            OSStatus status = UCKeyTranslate(layout, code, kUCKeyActionDisplay, modifiers, LMGetKbdType(),
                                             kUCKeyTranslateNoDeadKeysBit, &deadKeys, 4, &length, chars);
            if (status == noErr && length == 1 && (chars[0] == 'v' || chars[0] == 'V')) {
                result = code;
                break;
            }
        }
    }
    CFRelease(source);
    return result;
}

static const CGEventFlags pbLeftCommandFlags = kCGEventFlagMaskCommand | 0x00000008;

static int pbPostKey(CGEventSourceRef source, CGKeyCode code, bool down, CGEventFlags flags) {
    CGEventRef event = CGEventCreateKeyboardEvent(source, code, down);
    if (event == NULL) {
        return 0;
    }
    CGEventSetFlags(event, flags);
    CGEventPost(kCGSessionEventTap, event);
    CFRelease(event);
    usleep(12000);
    return 1;
}

int pbSendPaste(void) {
    __block CGKeyCode code = kVK_ANSI_V;
    pbOnMainSync(^{
        code = pbKeyCodeForV();
    });

    CGEventSourceRef source = CGEventSourceCreate(kCGEventSourceStateCombinedSessionState);
    if (source == NULL) {
        return 0;
    }
    CGEventSourceSetLocalEventsFilterDuringSuppressionState(
        source, kCGEventFilterMaskPermitLocalMouseEvents | kCGEventFilterMaskPermitSystemDefinedEvents,
        kCGEventSuppressionStateSuppressionInterval);

    int ok = pbPostKey(source, kVK_Command, true, pbLeftCommandFlags) &&
             pbPostKey(source, code, true, pbLeftCommandFlags) &&
             pbPostKey(source, code, false, pbLeftCommandFlags) &&
             pbPostKey(source, kVK_Command, false, 0);
    CFRelease(source);
    return ok;
}
