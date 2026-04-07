/**
 * FIX: ExpoSharing Native Module Not Found
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * ERROR: Cannot find native module 'ExpoSharing'
 * 
 * CAUSE: Your EAS Development Build was created BEFORE installing expo-sharing
 * 
 * SOLUTION: Rebuild EAS Development Build with all dependencies
 * 
 * ═════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: VERIFY ALL DEPENDENCIES ARE INSTALLED
// ─────────────────────────────────────────────────────────────────────────────

/*
Run this command:

npm list expo-sharing expo-file-system expo-intent-launcher react-native-webview

Expected output:
✅ expo-sharing@13.0.1
✅ expo-file-system@18.0.12
✅ expo-intent-launcher@12.0.2
✅ react-native-webview@13.12.5

If any are missing, install them:

npm install expo-sharing expo-file-system expo-intent-launcher react-native-webview
*/

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: REBUILD EAS DEVELOPMENT BUILD
// ─────────────────────────────────────────────────────────────────────────────

/*
FOR ANDROID:

eas build --platform android --profile development

Then:
- Wait for build to complete
- Download the APK
- Install on device/emulator
- Run: npm start
- Press 'a' to open on Android


FOR iOS:

eas build --platform ios --profile development

Then:
- Wait for build to complete
- Download the .ipa or use Xcode
- Install on simulator/device
- Run: npm start
- Press 'i' to open on iOS


FOR BOTH PLATFORMS:

eas build --platform all --profile development
*/

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: VERIFY BUILD INCLUDES NATIVE MODULES
// ─────────────────────────────────────────────────────────────────────────────

/*
After rebuilding, check that native modules are available:

1. Open the app
2. Go to Orders screen
3. Click "View Invoice" or "Download Invoice"
4. Check console for:
   ✅ [Invoice Download] Starting download
   ✅ [Invoice Open] Opening PDF
   ✅ No "Cannot find native module" errors
*/

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4: IF STILL NOT WORKING
// ─────────────────────────────────────────────────────────────────────────────

/*
Try these troubleshooting steps:

1. CLEAR CACHE:
   rm -rf node_modules
   npm install
   eas build --platform android --profile development --clear-cache

2. CHECK eas.json:
   Make sure your eas.json has correct configuration

3. VERIFY EXPO VERSION:
   npm list expo
   Should be 52.0.0 or higher

4. CHECK PACKAGE.JSON:
   Verify all dependencies are listed:
   {
     "dependencies": {
       "expo": "^52.0.0",
       "expo-sharing": "^13.0.0",
       "expo-file-system": "^18.0.0",
       "expo-intent-launcher": "^12.0.0",
       "react-native-webview": "^13.0.0"
     }
   }

5. REBUILD WITH VERBOSE:
   eas build --platform android --profile development --verbose
*/

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5: ALTERNATIVE - USE SIMPLER APPROACH (IF STILL FAILING)
// ─────────────────────────────────────────────────────────────────────────────

/*
If expo-sharing still doesn't work, use this fallback:

Replace openInvoicePDF in downloadInvoice.js:

export const openInvoicePDF = async (fileUri) => {
  try {
    console.log('[Invoice Open] Opening PDF:', fileUri);

    if (Platform.OS === 'ios') {
      // iOS: Try Sharing first, fallback to Linking
      try {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/pdf',
        });
      } catch (e) {
        console.log('[Invoice Open] Sharing failed, trying Linking');
        // Fallback: just show file path
        Alert.alert('Invoice Downloaded', `Saved to: ${fileUri}`);
      }
    } else {
      // Android: Use IntentLauncher
      try {
        const contentUri = await FileSystem.getContentUriAsync(fileUri);
        await IntentLauncher.startActivityAsync(
          'android.intent.action.VIEW',
          {
            data: contentUri,
            flags: 1,
            type: 'application/pdf',
          }
        );
      } catch (e) {
        console.log('[Invoice Open] IntentLauncher failed');
        Alert.alert('Invoice Downloaded', `Saved to: ${fileUri}`);
      }
    }

    console.log('[Invoice Open] PDF opened successfully');
  } catch (error) {
    console.error('[Invoice Open Error]', error.message);
    throw new InvoiceDownloadError(
      'Failed to open PDF',
      'OPEN_ERROR',
      error
    );
  }
};
*/

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6: QUICK CHECKLIST
// ─────────────────────────────────────────────────────────────────────────────

/*
Before rebuilding, verify:

□ All npm packages installed
□ No conflicting versions
□ eas.json is correct
□ Expo account logged in (eas login)
□ Internet connection stable
□ Enough disk space for build
□ No pending git changes (optional)

After rebuilding:

□ New APK/IPA downloaded
□ App installed on device
□ App opens without crashes
□ Invoice buttons visible
□ Download works
□ PDF opens
*/

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7: VERIFY YOUR eas.json
// ─────────────────────────────────────────────────────────────────────────────

/*
Your eas.json should look like this:

{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
*/

export default {};
