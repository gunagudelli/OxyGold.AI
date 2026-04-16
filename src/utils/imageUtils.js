/**
 * Image Utilities for handling multiple product image views
 */

/**
 * Get all available image URLs from image object
 * @param {Object} imageObj - Image object with multiple view URLs
 * @returns {Array} Array of available image URLs
 */
export const getAllImageUrls = (imageObj) => {
  if (!imageObj) return [];
  
  const images = [];
  const views = ['frontViewUrl', 'topViewUrl', 'leftViewUrl', 'rightViewUrl', 'backViewUrl', 'bottomViewUrl'];
  
  views.forEach(view => {
    if (imageObj[view]) {
      images.push({
        url: imageObj[view],
        type: view.replace('Url', ''),
      });
    }
  });
  
  return images;
};

/**
 * Get primary image (front view, or first available)
 * @param {Object} imageObj - Image object with multiple view URLs
 * @returns {string|null} Primary image URL
 */
export const getPrimaryImage = (imageObj) => {
  if (!imageObj) return null;
  return imageObj.frontViewUrl || imageObj.topViewUrl || imageObj.backViewUrl || null;
};

/**
 * Get image by type
 * @param {Object} imageObj - Image object with multiple view URLs
 * @param {string} type - Image type (front, top, left, right, back, bottom)
 * @returns {string|null} Image URL for the specified type
 */
export const getImageByType = (imageObj, type) => {
  if (!imageObj || !type) return null;
  const key = `${type}ViewUrl`;
  return imageObj[key] || null;
};

/**
 * Check if image is expired based on expiresIn timestamp
 * @param {number} expiresIn - Expiration time in seconds from API response
 * @returns {boolean} True if expired
 */
export const isImageExpired = (expiresIn) => {
  if (!expiresIn) return false;
  return Date.now() > expiresIn * 1000;
};
