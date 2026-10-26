#ifndef PROMPTR_APPS_DARWIN_H
#define PROMPTR_APPS_DARWIN_H

void pbRememberFrontmost(void);
char *pbPreviousApp(void);
char *pbAppName(const char *bundleID);
char *pbAppIconPNGBase64(const char *bundleID, int size);
int pbAppRunning(const char *bundleID);
int pbActivateApp(const char *bundleID);
int pbIsFrontmost(const char *bundleID);
int pbAccessibilityTrusted(int prompt);
void pbOpenAccessibilitySettings(void);
void pbHideAppSync(void);
int pbSendPaste(void);

#endif
