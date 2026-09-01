/**
 * Invoice Download Utility
 * ─────────────────────────────────────────────────────────────────────────────
 * ✅ Download PDF with Authorization header
 * ✅ Save to device storage
 * ✅ Progress tracking
 * ✅ Error handling (401, network, etc.)
 * ✅ Open PDF after download
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform, Alert } from 'react-native';
import { BASE_URL, PHYSICAL_GOLD_BASE_URL } from '../constants/api';

export class InvoiceDownloadError extends Error {
  constructor(message, code, originalError) {
    super(message);
    this.name = 'InvoiceDownloadError';
    this.code = code;
    this.originalError = originalError;
  }
}

/**
 * Download invoice PDF with authorization
 * @param {string} orderNumber - Order number for the invoice
 * @param {string} accessToken - Bearer token for authorization
 * @param {function} onProgress - Callback for progress (0-100)
 * @returns {Promise<string>} - File URI of downloaded PDF
 */
export const downloadInvoicePDF = async (orderNumber, accessToken, onProgress) => {
  if (!orderNumber) {
    throw new InvoiceDownloadError('Order number is required', 'INVALID_ORDER', null);
  }

  if (!accessToken) {
    throw new InvoiceDownloadError('Access token is required', 'NO_TOKEN', null);
  }

  const invoiceUrl = `${BASE_URL}/oxygold-api/invoices/${orderNumber}/pdf`;
  const fileName = `Invoice_${orderNumber}_${Date.now()}.pdf`;
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;

  console.log('[Invoice Download] Starting download');
  console.log('[Invoice Download] URL:', invoiceUrl);
  console.log('[Invoice Download] File URI:', fileUri);

  try {
    const downloadResult = await FileSystem.downloadAsync(
      invoiceUrl,
      fileUri,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        md5: false,
      }
    );

    console.log('[Invoice Download] Download result:', downloadResult);

    if (downloadResult.status !== 200) {
      throw new InvoiceDownloadError(
        `Download failed with status ${downloadResult.status}`,
        'DOWNLOAD_FAILED',
        null
      );
    }

    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new InvoiceDownloadError('Downloaded file not found', 'FILE_NOT_FOUND', null);
    }

    console.log('[Invoice Download] File downloaded successfully');
    console.log('[Invoice Download] File size:', fileInfo.size, 'bytes');

    if (onProgress) onProgress(100);

    return fileUri;
  } catch (error) {
    console.error('[Invoice Download Error]', error.message);

    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      throw new InvoiceDownloadError(
        'Session expired. Please login again.',
        'UNAUTHORIZED',
        error
      );
    }

    if (error.message?.includes('404') || error.message?.includes('Not Found')) {
      throw new InvoiceDownloadError(
        'Invoice not found',
        'NOT_FOUND',
        error
      );
    }

    if (error.message?.includes('Network')) {
      throw new InvoiceDownloadError(
        'Network error. Please check your connection.',
        'NETWORK_ERROR',
        error
      );
    }

    if (error instanceof InvoiceDownloadError) {
      throw error;
    }

    throw new InvoiceDownloadError(
      error.message || 'Failed to download invoice',
      'DOWNLOAD_ERROR',
      error
    );
  }
};

/**
 * Download digital gold sell invoice PDF
 * @param {string} transactionId - Transaction ID for the sell invoice
 * @param {string} accessToken - Bearer token for authorization
 * @returns {Promise<string>} - File URI of downloaded PDF
 */
export const downloadSellInvoicePDF = async (transactionId, accessToken) => {
  if (!transactionId) {
    throw new InvoiceDownloadError('Transaction ID is required', 'INVALID_TRANSACTION', null);
  }

  if (!accessToken) {
    throw new InvoiceDownloadError('Access token is required', 'NO_TOKEN', null);
  }

  const invoiceUrl = `${BASE_URL}/oxygold-api/invoices/${transactionId}/pdf`;
  const fileName = `Sell_Invoice_${transactionId}_${Date.now()}.pdf`;
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;

  console.log('[Sell Invoice Download] Starting download');
  console.log('[Sell Invoice Download] URL:', invoiceUrl);
  console.log('[Sell Invoice Download] File URI:', fileUri);

  try {
    const downloadResult = await FileSystem.downloadAsync(
      invoiceUrl,
      fileUri,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        md5: false,
      }
    );

    console.log('[Sell Invoice Download] Download result:', downloadResult);

    if (downloadResult.status !== 200) {
      throw new InvoiceDownloadError(
        `Download failed with status ${downloadResult.status}`,
        'DOWNLOAD_FAILED',
        null
      );
    }

    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (!fileInfo.exists) {
      throw new InvoiceDownloadError('Downloaded file not found', 'FILE_NOT_FOUND', null);
    }

    console.log('[Sell Invoice Download] File downloaded successfully');
    console.log('[Sell Invoice Download] File size:', fileInfo.size, 'bytes');

    return fileUri;
  } catch (error) {
    console.error('[Sell Invoice Download Error]', error.message);

    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      throw new InvoiceDownloadError(
        'Session expired. Please login again.',
        'UNAUTHORIZED',
        error
      );
    }

    if (error.message?.includes('404') || error.message?.includes('Not Found')) {
      throw new InvoiceDownloadError(
        'Invoice not found',
        'NOT_FOUND',
        error
      );
    }

    if (error.message?.includes('Network')) {
      throw new InvoiceDownloadError(
        'Network error. Please check your connection.',
        'NETWORK_ERROR',
        error
      );
    }

    if (error instanceof InvoiceDownloadError) {
      throw error;
    }

    throw new InvoiceDownloadError(
      error.message || 'Failed to download invoice',
      'DOWNLOAD_ERROR',
      error
    );
  }
};

/**
 * Open PDF file after download
 * @param {string} fileUri - File URI of the PDF
 */
export const openInvoicePDF = async (fileUri) => {
  try {
    console.log('[Invoice Open] Opening PDF:', fileUri);

    if (Platform.OS === 'ios') {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
      });
    } else {
      // Android: Convert file URI to content URI
      const contentUri = await FileSystem.getContentUriAsync(fileUri);
      console.log('[Invoice Open] Content URI:', contentUri);

      await IntentLauncher.startActivityAsync(
        'android.intent.action.VIEW',
        {
          data: contentUri,
          flags: 1,
          type: 'application/pdf',
        }
      );
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

/**
 * Share invoice PDF
 * @param {string} fileUri - File URI of the PDF
 */
export const shareInvoicePDF = async (fileUri) => {
  try {
    console.log('[Invoice Share] Sharing PDF:', fileUri);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      throw new InvoiceDownloadError(
        'Sharing is not available on this device',
        'SHARE_NOT_AVAILABLE',
        null
      );
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Share Invoice',
    });

    console.log('[Invoice Share] PDF shared successfully');
  } catch (error) {
    console.error('[Invoice Share Error]', error.message);
    throw new InvoiceDownloadError(
      'Failed to share PDF',
      'SHARE_ERROR',
      error
    );
  }
};

/**
 * Delete downloaded invoice file
 * @param {string} fileUri - File URI of the PDF
 */
export const deleteInvoicePDF = async (fileUri) => {
  try {
    console.log('[Invoice Delete] Deleting PDF:', fileUri);

    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(fileUri);
      console.log('[Invoice Delete] PDF deleted successfully');
    }
  } catch (error) {
    console.error('[Invoice Delete Error]', error.message);
  }
};
