/**
 * INVOICE SYSTEM - COMPLETE INTEGRATION GUIDE
 * ═════════════════════════════════════════════════════════════════════════════
 * 
 * Production-ready invoice viewing and downloading for React Native Expo app
 * 
 * FEATURES:
 * ✅ View PDF invoices in WebView with Authorization header
 * ✅ Download PDF invoices to device storage
 * ✅ Open downloaded PDFs with native viewer
 * ✅ Share invoices via native sharing
 * ✅ Error handling (401, 404, network errors)
 * ✅ Progress tracking
 * ✅ Clean, modular code
 * 
 * ═════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1: INSTALL REQUIRED DEPENDENCIES
// ─────────────────────────────────────────────────────────────────────────────

/*
Run these commands in your project root:

npm install react-native-webview
npm install expo-file-system
npm install expo-sharing
npm install expo-intent-launcher

Or with yarn:

yarn add react-native-webview
yarn add expo-file-system
yarn add expo-sharing
yarn add expo-intent-launcher

For EAS Development Build, rebuild:

eas build --platform android --profile development
eas build --platform ios --profile development
*/

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2: FILE STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

/*
src/
├── utils/
│   └── downloadInvoice.js          ← Invoice download utility
├── physicalGoldScreens/
│   ├── PgOrdersScreen.js           ← Updated with invoice buttons
│   └── PgInvoiceViewerScreen.js    ← New WebView screen
└── navigation/
    └── AppNavigator.js             ← Updated with invoice route
*/

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3: CREATED FILES
// ─────────────────────────────────────────────────────────────────────────────

/*
✅ src/utils/downloadInvoice.js
   - downloadInvoicePDF(orderNumber, accessToken, onProgress)
   - openInvoicePDF(fileUri)
   - shareInvoicePDF(fileUri)
   - deleteInvoicePDF(fileUri)
   - InvoiceDownloadError class

✅ src/physicalGoldScreens/PgInvoiceViewerScreen.js
   - WebView component with Authorization header
   - Download button
   - Error handling
   - Loading indicator

✅ src/physicalGoldScreens/PgOrdersScreen.js (UPDATED)
   - Added "View Invoice" button
   - Added "Download Invoice" button
   - Invoice action handlers

✅ src/navigation/AppNavigator.js (UPDATED)
   - Added PgInvoiceViewer route
*/

// ─────────────────────────────────────────────────────────────────────────────
// STEP 4: HOW IT WORKS
// ─────────────────────────────────────────────────────────────────────────────

/*
USER FLOW:

1. User opens Orders screen
   ↓
2. Each order shows two buttons:
   - "View Invoice" → Opens WebView with PDF
   - "Download Invoice" → Downloads PDF to device
   ↓
3. VIEW INVOICE:
   - Navigates to PgInvoiceViewerScreen
   - WebView loads PDF from API with Authorization header
   - User can see invoice in app
   - Can download from there too
   ↓
4. DOWNLOAD INVOICE:
   - Uses downloadInvoicePDF() utility
   - Sends GET request with Authorization header
   - Saves PDF to device storage
   - Shows success alert with "Open" option
   - User can open with native PDF viewer
   ↓
5. OPEN PDF:
   - iOS: Uses Sharing.shareAsync()
   - Android: Uses IntentLauncher to open with default viewer
*/

// ─────────────────────────────────────────────────────────────────────────────
// STEP 5: API INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────

/*
BACKEND API REQUIREMENTS:

Endpoint: GET /api/invoices/{orderNumber}/pdf

Headers:
  Authorization: Bearer <accessToken>
  Content-Type: application/pdf

Response:
  - Status: 200
  - Body: Binary PDF file
  - Content-Type: application/pdf

Error Responses:
  - 401: Unauthorized (session expired)
  - 404: Invoice not found
  - 500: Server error

EXAMPLE CURL:
  curl -H "Authorization: Bearer YOUR_TOKEN" \
       http://65.0.147.157:9900/api/invoices/12345/pdf \
       -o invoice.pdf
*/

// ─────────────────────────────────────────────────────────────────────────────
// STEP 6: USAGE EXAMPLES
// ─────────────────────────────────────────────────────────────────────────────

/*
EXAMPLE 1: View Invoice in WebView
─────────────────────────────────────

import { useSelector } from 'react-redux';
import { selectAccessToken } from '../store/authSlice';

const MyComponent = ({ navigation }) => {
  const accessToken = useSelector(selectAccessToken);

  const handleViewInvoice = (orderNumber) => {
    navigation.navigate('PgInvoiceViewer', { orderNumber });
  };

  return (
    <TouchableOpacity onPress={() => handleViewInvoice('12345')}>
      <Text>View Invoice</Text>
    </TouchableOpacity>
  );
};


EXAMPLE 2: Download Invoice
─────────────────────────────

import { downloadInvoicePDF, openInvoicePDF } from '../utils/downloadInvoice';
import { useSelector } from 'react-redux';
import { selectAccessToken } from '../store/authSlice';

const MyComponent = () => {
  const accessToken = useSelector(selectAccessToken);

  const handleDownload = async () => {
    try {
      const fileUri = await downloadInvoicePDF('12345', accessToken);
      
      Alert.alert('Success', 'Invoice downloaded', [
        {
          text: 'Open',
          onPress: async () => {
            await openInvoicePDF(fileUri);
          },
        },
      ]);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <TouchableOpacity onPress={handleDownload}>
      <Text>Download Invoice</Text>
    </TouchableOpacity>
  );
};


EXAMPLE 3: Share Invoice
─────────────────────────

import { downloadInvoicePDF, shareInvoicePDF } from '../utils/downloadInvoice';

const handleShare = async () => {
  try {
    const fileUri = await downloadInvoicePDF('12345', accessToken);
    await shareInvoicePDF(fileUri);
  } catch (error) {
    Alert.alert('Error', error.message);
  }
};
*/

// ─────────────────────────────────────────────────────────────────────────────
// STEP 7: ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────

/*
The system handles these errors:

1. UNAUTHORIZED (401)
   - Message: "Session expired. Please login again."
   - Action: User should login again

2. NOT_FOUND (404)
   - Message: "Invoice not found"
   - Action: Invoice doesn't exist for this order

3. NETWORK_ERROR
   - Message: "Network error. Please check your connection."
   - Action: Check internet connection and retry

4. DOWNLOAD_FAILED
   - Message: "Download failed with status XXX"
   - Action: Retry download

5. FILE_NOT_FOUND
   - Message: "Downloaded file not found"
   - Action: Retry download

6. OPEN_ERROR
   - Message: "Failed to open PDF"
   - Action: Try downloading again

All errors are caught and shown to user via Alert.alert()
*/

// ─────────────────────────────────────────────────────────────────────────────
// STEP 8: TESTING
// ─────────────────────────────────────────────────────────────────────────────

/*
MANUAL TESTING CHECKLIST:

□ View Invoice
  - Navigate to Orders screen
  - Click "View Invoice" button
  - PDF loads in WebView
  - Can scroll and zoom
  - Download button works

□ Download Invoice
  - Click "Download Invoice" button
  - Shows success alert
  - Can open with native viewer
  - File saved to device storage

□ Error Handling
  - Test with invalid order number
  - Test with expired token (logout then try)
  - Test with no internet connection
  - Verify error messages are clear

□ Platform Testing
  - Test on Android device/emulator
  - Test on iOS device/simulator
  - Verify PDF opens with correct viewer

□ Performance
  - Large PDF files download smoothly
  - No app crashes
  - Memory usage is reasonable
*/

// ─────────────────────────────────────────────────────────────────────────────
// STEP 9: TROUBLESHOOTING
// ─────────────────────────────────────────────────────────────────────────────

/*
ISSUE: WebView shows blank page
SOLUTION:
  - Check Authorization header is correct
  - Verify API endpoint is correct
  - Check network connectivity
  - Look at console logs for errors

ISSUE: Download fails with "Network error"
SOLUTION:
  - Check internet connection
  - Verify API is accessible
  - Check firewall/proxy settings
  - Try with curl first to test API

ISSUE: PDF won't open after download
SOLUTION:
  - Check file permissions
  - Verify PDF file is valid
  - Try opening with different app
  - Check device storage space

ISSUE: Authorization header not sent
SOLUTION:
  - Verify accessToken is not null
  - Check token format (should be "Bearer TOKEN")
  - Verify Redux selector is working
  - Check apiClient configuration

ISSUE: App crashes on iOS
SOLUTION:
  - Rebuild EAS development build
  - Check react-native-webview version
  - Verify all dependencies installed
  - Check iOS deployment target
*/

// ─────────────────────────────────────────────────────────────────────────────
// STEP 10: PRODUCTION CHECKLIST
// ─────────────────────────────────────────────────────────────────────────────

/*
Before deploying to production:

□ All dependencies installed and versions locked
□ Error handling covers all edge cases
□ Logging is appropriate (not too verbose)
□ File cleanup implemented (old PDFs deleted)
□ Token refresh handled (401 errors)
□ Network timeout configured
□ File size limits checked
□ Storage permissions verified
□ iOS and Android tested
□ Performance optimized
□ Security review completed
□ User feedback tested
*/

// ─────────────────────────────────────────────────────────────────────────────
// STEP 11: ADVANCED FEATURES (OPTIONAL)
// ─────────────────────────────────────────────────────────────────────────────

/*
You can extend this system with:

1. CACHING
   - Cache downloaded PDFs
   - Reuse if already downloaded
   - Clear cache periodically

2. BATCH DOWNLOAD
   - Download multiple invoices
   - Show progress for each
   - Zip them together

3. EMAIL INVOICE
   - Send invoice via email
   - Use native email client

4. PRINT INVOICE
   - Print directly from app
   - Use react-native-print

5. INVOICE HISTORY
   - Track downloaded invoices
   - Show download date/time
   - Quick access to recent

6. OFFLINE MODE
   - Cache invoices for offline viewing
   - Sync when online
*/

// ─────────────────────────────────────────────────────────────────────────────
// STEP 12: SUPPORT & DEBUGGING
// ─────────────────────────────────────────────────────────────────────────────

/*
CONSOLE LOGS TO WATCH:

[Invoice Download] Starting download
[Invoice Download] URL: ...
[Invoice Download] File URI: ...
[Invoice Download] Download result: ...
[Invoice Download] File downloaded successfully
[Invoice Download] File size: ... bytes

[Invoice Open] Opening PDF: ...
[Invoice Open] PDF opened successfully

[Invoice Share] Sharing PDF: ...
[Invoice Share] PDF shared successfully

[Invoice Delete] Deleting PDF: ...
[Invoice Delete] PDF deleted successfully

[WebView Error] ...
[WebView HTTP Error] ...

[Orders] View invoice for order: ...
[Orders] Download invoice for order: ...
[Orders Download Error] ...
*/

export default {};
