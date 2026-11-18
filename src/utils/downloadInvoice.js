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

    if (Platform.OS === 'ios') {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/pdf',
      });
    } else {
      // Android: Convert file URI to content URI
      const contentUri = await FileSystem.getContentUriAsync(fileUri);

      await IntentLauncher.startActivityAsync(
        'android.intent.action.VIEW',
        {
          data: contentUri,
          flags: 1,
          type: 'application/pdf',
        }
      );
    }

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

    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(fileUri);
    }
  } catch (error) {
    console.error('[Invoice Delete Error]', error.message);
  }
};
