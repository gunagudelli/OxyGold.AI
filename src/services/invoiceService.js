/**
 * Invoice Service - Handles invoice generation and retrieval
 * Production-ready with comprehensive error handling and security
 */

const API_BASE = 'http://65.0.147.157:9900';
const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Fetch with timeout to prevent app freezing
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<Response>}
 */
const fetchWithTimeout = (url, options, timeout = REQUEST_TIMEOUT) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('REQUEST_TIMEOUT')), timeout)
    ),
  ]);
};

/**
 * Safe JSON parsing
 * @param {Response} response - Fetch response
 * @returns {Promise<Object>}
 */
const safeJsonParse = async (response) => {
  try {
    const text = await response.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (error) {
    console.error('[InvoiceService] JSON parse error:', error.message);
    return {};
  }
};

export const invoiceService = {
  /**
   * Generate invoice for an order
   * @param {number} orderId - Order ID
   * @param {string} accessToken - Auth token
   * @returns {Promise<Object>} Invoice data with pdfUrl
   */
  generateInvoice: async (orderId, accessToken) => {
    try {
      console.log('[InvoiceService] Generating invoice');

      if (!orderId) {
        throw new Error('ORDER_ID_MISSING');
      }

      if (!accessToken) {
        throw new Error('AUTH_TOKEN_MISSING');
      }

      const response = await fetchWithTimeout(
        `${API_BASE}/api/invoices/generate-from-order/${orderId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await safeJsonParse(response);

      if (!response.ok) {
        console.warn('[InvoiceService] Invoice generation failed:', data?.message);
        // Don't throw - invoice generation is non-critical
        return { pdfUrl: null };
      }

      const invoiceData = data?.data;
      const pdfUrl = invoiceData?.pdfUrl || invoiceData?.url;

      console.log('[InvoiceService] Invoice generated successfully');

      return {
        invoiceNumber: invoiceData?.invoiceNumber,
        pdfUrl: pdfUrl || null,
      };
    } catch (error) {
      console.warn('[InvoiceService] Generate invoice error:', error.message);
      // Don't throw - invoice generation is non-critical
      return { pdfUrl: null };
    }
  },

  /**
   * Get invoice preview
   * @param {string} orderNumber - Order number
   * @param {string} accessToken - Auth token
   * @returns {Promise<Object>} Invoice preview data
   */
  getInvoicePreview: async (orderNumber, accessToken) => {
    try {
      console.log('[InvoiceService] Fetching invoice preview');

      if (!orderNumber) {
        throw new Error('ORDER_NUMBER_MISSING');
      }

      if (!accessToken) {
        throw new Error('AUTH_TOKEN_MISSING');
      }

      const response = await fetchWithTimeout(
        `${API_BASE}/api/invoices/${orderNumber}/pdf/preview`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await safeJsonParse(response);

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to fetch invoice preview');
      }

      console.log('[InvoiceService] Invoice preview fetched successfully');
      return data?.data || data;
    } catch (error) {
      console.error('[InvoiceService] Get preview error:', error.message);
      throw error;
    }
  },

  /**
   * Download invoice PDF
   * @param {string} orderNumber - Order number
   * @param {string} accessToken - Auth token
   * @returns {Promise<string>} PDF URL
   */
  downloadInvoice: async (orderNumber, accessToken) => {
    try {
      console.log('[InvoiceService] Downloading invoice');

      if (!orderNumber) {
        throw new Error('ORDER_NUMBER_MISSING');
      }

      if (!accessToken) {
        throw new Error('AUTH_TOKEN_MISSING');
      }

      const response = await fetchWithTimeout(
        `${API_BASE}/api/invoices/${orderNumber}/pdf`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to download invoice');
      }

      // Return the blob URL for download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      console.log('[InvoiceService] Invoice downloaded successfully');
      return url;
    } catch (error) {
      console.error('[InvoiceService] Download error:', error.message);
      throw error;
    }
  },
};

export default invoiceService;
