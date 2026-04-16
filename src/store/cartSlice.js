import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  cartCount: 0,
  wishlistCount: 0,
  lastUpdated: null,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCartCount(state, action) {
      state.cartCount = action.payload;
      state.lastUpdated = Date.now();
    },
    setWishlistCount(state, action) {
      state.wishlistCount = action.payload;
      state.lastUpdated = Date.now();
    },
    incrementCartCount(state) {
      state.cartCount += 1;
      state.lastUpdated = Date.now();
    },
    decrementCartCount(state) {
      state.cartCount = Math.max(0, state.cartCount - 1);
      state.lastUpdated = Date.now();
    },
    incrementWishlistCount(state) {
      state.wishlistCount += 1;
      state.lastUpdated = Date.now();
    },
    decrementWishlistCount(state) {
      state.wishlistCount = Math.max(0, state.wishlistCount - 1);
      state.lastUpdated = Date.now();
    },
    resetCounts(state) {
      state.cartCount = 0;
      state.wishlistCount = 0;
      state.lastUpdated = null;
    },
  },
});

export const {
  setCartCount,
  setWishlistCount,
  incrementCartCount,
  decrementCartCount,
  incrementWishlistCount,
  decrementWishlistCount,
  resetCounts,
} = cartSlice.actions;

export default cartSlice.reducer;

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectCartCount = (s) => s?.cart?.cartCount || 0;
export const selectWishlistCount = (s) => s?.cart?.wishlistCount || 0;
export const selectCartLastUpdated = (s) => s?.cart?.lastUpdated || null;
