# Mobile Device Automation, Testing & Bundling Cheatsheet
> Exact tools, commands, and workflows for AI Agents & Developers working on Android / Expo / React Native projects with physical devices.

---

## 1. Device Discovery & Identification

### Check Connected Devices
```bash
adb devices
```
*Sample output:*
```text
List of devices attached
ZD2228X6QH    device
```
> **Tip:** If multiple devices are attached, always pass `-s <DEVICE_SERIAL>` (e.g. `-s ZD2228X6QH`) to route ADB commands to that specific phone.

### Check Device Screen Resolution & ABI Architecture
```bash
# Get display resolution (width x height)
adb -s <DEVICE_SERIAL> shell wm size

# Get device CPU architecture (e.g., arm64-v8a)
adb -s <DEVICE_SERIAL> shell getprop ro.product.cpu.abi
```

---

## 2. Taking Screenshots & Inspecting the Screen

### Take a Screenshot and Pull to PC
```bash
# Take screenshot on phone and pull to PC
adb -s <DEVICE_SERIAL> shell screencap -p /sdcard/screen.png
adb -s <DEVICE_SERIAL> pull /sdcard/screen.png ./screen.png
```
*How AI agent inspects it:* Call the `read_file` tool on `./screen.png`.

---

## 3. UI Hierarchy & Exact Tap Coordinates

### Dump UI Hierarchy XML
```bash
# Dump all rendered UI nodes and their exact pixel bounding boxes
adb -s <DEVICE_SERIAL> shell uiautomator dump /sdcard/ui.xml
adb -s <DEVICE_SERIAL> pull /sdcard/ui.xml ./ui.xml
```

### Find Text Coordinates in PowerShell
```powershell
# Parse XML and extract bounds for any element containing specific text
$xml = [xml](Get-Content ./ui.xml)
$xml.SelectNodes('//*[contains(@text, "Driving")]') | Select-Object text, bounds
```
*Output will give bounds like `[457,757][575,802]`.*
*The tap point `(X, Y)` is the center: `X = (457 + 575) / 2 = 516`, `Y = (757 + 802) / 2 = 780`.*

---

## 4. Simulating Touch, Gestures & Key Events

### Tap on Screen
```bash
adb -s <DEVICE_SERIAL> shell input tap <X> <Y>
```

### Type Text into Active Input
```bash
adb -s <DEVICE_SERIAL> shell input text "HelloTechBuddy"
```
*(Spaces must be escaped as `%s`, e.g., `"Hello%sWorld"`).*

### Key Events (Home, Back, Volume, Power)
```bash
# Back button
adb -s <DEVICE_SERIAL> shell input keyevent 4

# Home button
adb -s <DEVICE_SERIAL> shell input keyevent 3

# App Switcher / Recents
adb -s <DEVICE_SERIAL> shell input keyevent 187

# Wake screen / Power button
adb -s <DEVICE_SERIAL> shell input keyevent 26
```

### Swipe / Scroll
```bash
# Swipe from (x1, y1) to (x2, y2) in duration milliseconds
# Example: Scroll down
adb -s <DEVICE_SERIAL> shell input swipe 540 1600 540 400 300
```

---

## 5. App Lifecycle & Deep Link Execution

### Launch App
```bash
adb -s <DEVICE_SERIAL> shell am start -n <PACKAGE_NAME>/<ACTIVITY_NAME>
# Example:
adb -s <DEVICE_SERIAL> shell am start -n com.techbuddy.caller/.MainActivity
```

### Force-Stop App
```bash
adb -s <DEVICE_SERIAL> shell am force-stop com.techbuddy.caller
```

### Open Custom Deep Link / Screen
```bash
adb -s <DEVICE_SERIAL> shell am start -a android.intent.action.VIEW -d "techbuddycaller://active-call"
```

---

## 6. Offline Standalone JS Bundling (Crucial for Expo Router)

By default, Expo debug builds look for the Metro development server. To make the app run 100% standalone and offline without Metro running:

### Expo Router Production / Standalone Bundle Command:
```bash
npx expo export:embed --platform android --dev false --entry-file node_modules/expo-router/entry.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/
```

> ⚠️ **Common AI Agent Pitfall:**
> - Never pass `--entry-file index.ts` or `index.js` in Expo Router projects.
> - Expo Router's true entry point is `node_modules/expo-router/entry.js`.
> - The output path must be `android/app/src/main/assets/index.android.bundle`.

---

## 7. Fast Native Gradle Build (Prevent Clang Crashes)

### Build Debug APK for Connected Device Architecture
```bash
# PowerShell / CMD:
cmd /c "cd android && gradlew.bat assembleDebug -PreactNativeArchitectures=arm64-v8a"
```

> ⚠️ **Common AI Agent Pitfall:**
> - Without `-PreactNativeArchitectures=arm64-v8a`, Gradle attempts to compile C++ libraries (Hermes, Reanimated, Worklets) for all 4 ABIs (`armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`).
> - `armeabi-v7a` frequently crashes on Windows with Clang memory limits or toolchain errors.
> - Targeting only `arm64-v8a` cuts build time by 75% and ensures 100% success on modern physical devices.

---

## 8. Deploying / Installing APK to Phone

### Streamed Install (Overwrites Existing Version)
```bash
adb -s <DEVICE_SERIAL> install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 9. Live Logs & Debugging

### Filter React Native & App Logs in Real Time
```bash
adb -s <DEVICE_SERIAL> logcat -d -s ReactNativeJS TechBuddyInCallService AndroidRuntime
```

### Clear Log Buffer
```bash
adb -s <DEVICE_SERIAL> logcat -c
```

---

## Summary Cheat Table for AI Agents

| Task | Command |
|---|---|
| **List Devices** | `adb devices` |
| **Capture Screen** | `adb -s <ID> shell screencap -p /sdcard/s.png ; adb -s <ID> pull /sdcard/s.png .` |
| **Dump UI Coordinates** | `adb -s <ID> shell uiautomator dump /sdcard/ui.xml ; adb -s <ID> pull /sdcard/ui.xml .` |
| **Tap Coordinates** | `adb -s <ID> shell input tap <X> <Y>` |
| **Bundle Expo Router** | `npx expo export:embed --platform android --dev false --entry-file node_modules/expo-router/entry.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/` |
| **Build APK (Fast)** | `cmd /c "cd android && gradlew.bat assembleDebug -PreactNativeArchitectures=arm64-v8a"` |
| **Install APK** | `adb -s <ID> install -r android/app/build/outputs/apk/debug/app-debug.apk` |
| **Launch App** | `adb -s <ID> shell am start -n com.techbuddy.caller/.MainActivity` |

