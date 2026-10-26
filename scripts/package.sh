#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

APP_NAME="Promptr"
VERSION="$(plutil -extract info.productVersion raw wails.json)"
MIN_MACOS="13.0"
PLATFORM="${PLATFORM:-darwin/universal}"
SIGN_IDENTITY="${SIGN_IDENTITY:-}"
NOTARY_PROFILE="${NOTARY_PROFILE:-}"

APP="build/bin/${APP_NAME}.app"
DIST="dist"
DMG="${DIST}/${APP_NAME}.dmg"

export PATH="$PATH:$HOME/go/bin"
export CGO_CFLAGS="-mmacosx-version-min=${MIN_MACOS}"
export CGO_LDFLAGS="-mmacosx-version-min=${MIN_MACOS}"

step() { printf '\n==> %s\n' "$1"; }

step "Checking"
go vet ./...
go test ./...
(cd frontend && npx tsc --noEmit)

step "Building ${APP_NAME} ${VERSION} for ${PLATFORM}"
wails build -clean -platform "$PLATFORM" -trimpath -ldflags "-s -w"

step "Signing"
if [[ -n "$SIGN_IDENTITY" ]]; then
  codesign --force --options runtime --timestamp --sign "$SIGN_IDENTITY" "$APP"
else
  echo "SIGN_IDENTITY not set: using an ad-hoc signature (fine for your own Mac, not for public download)"
  codesign --force --sign - "$APP"
fi
codesign --verify --strict --verbose=2 "$APP"

step "Creating ${DMG}"
mkdir -p "$DIST"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp -R "$APP" "$STAGE/"
ln -s /Applications "$STAGE/Applications"
rm -f "$DMG"
hdiutil create -volname "${APP_NAME} ${VERSION}" -srcfolder "$STAGE" -fs HFS+ -format UDZO -ov "$DMG" >/dev/null
if [[ -n "$SIGN_IDENTITY" ]]; then
  codesign --force --timestamp --sign "$SIGN_IDENTITY" "$DMG"
fi

if [[ -n "$NOTARY_PROFILE" ]]; then
  if [[ -z "$SIGN_IDENTITY" ]]; then
    echo "NOTARY_PROFILE needs SIGN_IDENTITY (a Developer ID Application certificate)" >&2
    exit 1
  fi
  step "Notarizing (this uploads the DMG to Apple and can take a few minutes)"
  xcrun notarytool submit "$DMG" --keychain-profile "$NOTARY_PROFILE" --wait
  xcrun stapler staple "$DMG"
  xcrun stapler validate "$DMG"
fi

(cd "$DIST" && shasum -a 256 "$(basename "$DMG")" > "$(basename "$DMG").sha256")

step "Done"
echo "App:      $APP ($(lipo -archs "$APP/Contents/MacOS/$APP_NAME"))"
echo "DMG:      $DMG ($(du -h "$DMG" | cut -f1))"
echo "SHA-256:  $(cut -d' ' -f1 "$DMG.sha256")"
