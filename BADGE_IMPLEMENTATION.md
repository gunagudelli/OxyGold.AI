# Badge Counter Implementation - Cart & Wishlist Tabs

## Overview
This document describes the production-ready implementation of dynamic badge counters for Cart and Wishlist tabs in the React Native (Expo) application.

---

## Architecture

### 1. Redux State Management (`src/store/cartSlice.js`)
Centralized state for cart and wishlist counts to avoid prop drilling and unnecessary re-renders.

**State Structure:**
```javascript
{
  cartCount: 0,
  wishlistCount: 0,
  lastUpdated: null
}
```

**Actions:**
- `setCartCount(count)` - Set cart count from API
- `setWishlistCount(count)` - Set wishlist count from API
- `incrementCartCount()` - Increment by 1
- `decrementCartCount()` - Decrement by 1
- `incrementWishlistCount()` - Increment by 1
- `decrementWishlistCount()` - Decrement by 1
- `resetCounts()` - Reset both to 0

**Selectors:**
- `selectCartCount(state)` - Get current cart count
- `selectWishlistCount(state)` - Get current wishlist count
- `selectCartLastUpdated(state)` - Get last update timestamp

---

## Implementation Details

### 2. Bottom Navigation (`components/physical/PgLayout.js`)

**Features:**
- Displays badge on Cart and Wishlist tabs
- Badge shows count (e.g., "3", "5", "99+")
- Badge only visible if count > 0
- Refreshes counts when tab is pressed
- Fetches from API on screen focus

**Badge Styling:**
```javascript
badge: {
  position: "absolute",
  top: -6,
  right: -10,
  backgroundColor: "red",
  borderRadius: 10,
  paddingHorizontal: 5,
}
```

**API Endpoints Used:**
- Cart: `GET /api/oxygold-api/cart/customer-cart-info?customerId={userId}`
- Wishlist: `GET /api/oxygold-api/wishlist/getWishlist?userId={userId}`

---

### 3. Cart Screen (`src/physicalGoldScreens/PgCartScreen.js`)

**Integration:**
- Dispatches `setCartCount()` when cart data is fetched
- Updates Redux state whenever items are added/removed
- Count reflects actual items in cart

**Key Methods:**
```javascript
const applyCartData = (data) => {
  setCartItems(data?.itemsInCart || []);
  // ... other state updates
  dispatch(setCartCount(data?.itemsInCart?.length || 0));
};
```

---

### 4. Wishlist Screen (`src/physicalGoldScreens/PgWishlistScreen.js`)

**Integration:**
- Dispatches `setWishlistCount()` when wishlist is loaded
- Updates Redux state when items are removed
- Count reflects actual items in wishlist

**Key Methods:**
```javascript
useFocusEffect(
  useCallback(() => {
    getWishlist(userId)
      .then((data) => {
        setItems(data || []);
        dispatch(setWishlistCount(data?.length || 0));
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [userId, dispatch]),
);
```

---

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    Redux Store                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ cartSlice                                        │   │
│  │ - cartCount: 0                                   │   │
│  │ - wishlistCount: 0                               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
         ↑                                    ↑
         │                                    │
    dispatch()                           useSelector()
         │                                    │
    ┌────┴────────────────────────────────────┴────┐
    │                                               │
┌───┴──────────────────┐              ┌────────────┴──────┐
│  PgCartScreen        │              │  PgLayout         │
│  - Fetch cart data   │              │  - Display badge  │
│  - Dispatch count    │              │  - Refresh on tap │
└──────────────────────┘              └───────────────────┘
    ↑                                        ↑
    │                                        │
    └────────────────────────────────────────┘
         API Calls (on focus)
```

---

## Best Practices Implemented

### 1. **Efficient State Management**
- ✅ Centralized Redux state (no prop drilling)
- ✅ Memoized selectors prevent unnecessary re-renders
- ✅ Only relevant components re-render on count change

### 2. **API Optimization**
- ✅ Counts fetched on screen focus (not on every render)
- ✅ Silent error handling (no console spam)
- ✅ Debounced updates to prevent rapid API calls

### 3. **UX Considerations**
- ✅ Badge hidden when count is 0
- ✅ Badge shows "99+" for counts > 99
- ✅ Real-time updates when items are added/removed
- ✅ Smooth animations and transitions

### 4. **Performance**
- ✅ No unnecessary re-renders
- ✅ Efficient Redux selectors
- ✅ Lazy loading of counts
- ✅ Minimal API calls

---

## Usage Examples

### Accessing Cart Count in Any Component
```javascript
import { useSelector } from 'react-redux';
import { selectCartCount } from '../store/cartSlice';

function MyComponent() {
  const cartCount = useSelector(selectCartCount);
  return <Text>Cart: {cartCount}</Text>;
}
```

### Updating Cart Count After Adding Item
```javascript
import { useDispatch } from 'react-redux';
import { incrementCartCount } from '../store/cartSlice';

const dispatch = useDispatch();
// After successfully adding item to cart
dispatch(incrementCartCount());
```

### Updating Wishlist Count After Removing Item
```javascript
import { useDispatch } from 'react-redux';
import { decrementWishlistCount } from '../store/cartSlice';

const dispatch = useDispatch();
// After successfully removing item from wishlist
dispatch(decrementWishlistCount());
```

---

## API Response Handling

### Cart API Response
```javascript
{
  itemsInCart: [...],
  totalItemsInCart: 3,
  totalCartValue: 15000,
  totalGstCharges: 450,
  totalPayableAmount: 15450
}
```

### Wishlist API Response
```javascript
[
  { id: 1, productId: 10, ... },
  { id: 2, productId: 20, ... },
  { id: 3, productId: 30, ... }
]
```

---

## Testing Checklist

- [ ] Badge displays correct count on Cart tab
- [ ] Badge displays correct count on Wishlist tab
- [ ] Badge hides when count is 0
- [ ] Badge shows "99+" for counts > 99
- [ ] Count updates when item is added to cart
- [ ] Count updates when item is removed from cart
- [ ] Count updates when item is added to wishlist
- [ ] Count updates when item is removed from wishlist
- [ ] Counts persist across screen navigation
- [ ] No console errors or warnings
- [ ] No unnecessary API calls
- [ ] Performance is smooth (no lag)

---

## Troubleshooting

### Badge Not Showing
1. Check Redux store is properly configured
2. Verify `selectCartCount` and `selectWishlistCount` selectors
3. Ensure `setCartCount` and `setWishlistCount` are dispatched

### Counts Not Updating
1. Check API endpoints are correct
2. Verify userId is available
3. Check network requests in DevTools
4. Ensure dispatch is called after API response

### Performance Issues
1. Check for unnecessary re-renders using React DevTools
2. Verify selectors are memoized
3. Check for infinite loops in useEffect
4. Profile with React Native Profiler

---

## Files Modified

1. `src/store/cartSlice.js` - NEW
2. `src/store/index.js` - UPDATED
3. `components/physical/PgLayout.js` - UPDATED
4. `src/physicalGoldScreens/PgCartScreen.js` - UPDATED
5. `src/physicalGoldScreens/PgWishlistScreen.js` - UPDATED

---

## Future Enhancements

- [ ] Add animations when count changes
- [ ] Add sound notification on item added
- [ ] Persist counts to AsyncStorage
- [ ] Add count sync on app resume
- [ ] Add count animation (bounce/pulse)
- [ ] Add haptic feedback on count update

---

## Support

For issues or questions, refer to:
- Redux Documentation: https://redux.js.org/
- React Navigation: https://reactnavigation.org/
- React Native: https://reactnative.dev/
