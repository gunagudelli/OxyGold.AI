export const FLATLIST_OPTIMIZATIONS = {
  // For product grids (2 columns)
  productGrid: {
    removeClippedSubviews: true,
    maxToRenderPerBatch: 10,
    updateCellsBatchingPeriod: 50,
    initialNumToRender: 6,
    windowSize: 5,
    getItemLayout: (data, index) => ({
      length: 280, // Approximate item height
      offset: 280 * index,
      index,
    }),
  },

  // For cart items (single column)
  cartList: {
    removeClippedSubviews: true,
    maxToRenderPerBatch: 8,
    updateCellsBatchingPeriod: 50,
    initialNumToRender: 5,
    windowSize: 5,
  },

  // For address list
  addressList: {
    removeClippedSubviews: true,
    maxToRenderPerBatch: 6,
    updateCellsBatchingPeriod: 50,
    initialNumToRender: 4,
    windowSize: 3,
  },

  // For order history
  orderList: {
    removeClippedSubviews: true,
    maxToRenderPerBatch: 8,
    updateCellsBatchingPeriod: 50,
    initialNumToRender: 5,
    windowSize: 5,
  },
};

export const keyExtractor = (item, index) => {
  return item?.id?.toString() || item?.cartId?.toString() || index.toString();
};
