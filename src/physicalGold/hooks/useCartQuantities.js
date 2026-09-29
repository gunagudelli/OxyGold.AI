import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useDispatch } from "react-redux";
import { setCartCount } from "../../store/cartSlice";
import { apiPost, apiDelete } from "../../services/apiClient";
import { PHYSICAL_GOLD_BASE_URL } from "../../constants/api";
import { getCart } from "../api/physicalGoldApi";

// Cart quantities for product cards, keyed by variant id, so a card can show
// a − qty + stepper once its item is in the cart. Same increment / decrement /
// remove calls the Cart screen makes.
//
//   cartQtyMap      { [variantId]: { qty, cartId, productId } }
//   cartVariantIds  Set of variant ids in the cart (for "is it in the cart?")
//   refreshCart()   reload from the server (also updates the header badge)
//   clearCart()     reset locally, e.g. for a guest
//   changeCartQty(productId, variantId, delta)  +1 / −1; −1 at qty 1 removes
//   cartBusyVariant variant id whose quantity is being changed, or null
export default function useCartQuantities(userId) {
  const dispatch = useDispatch();
  const [cartQtyMap, setCartQtyMap] = useState({});
  const [cartBusyVariant, setCartBusyVariant] = useState(null);

  const applyCart = useCallback(
    (cartData) => {
      const items = cartData?.itemsInCart || [];
      const map = {};
      items.forEach((it) => {
        if (it?.productVariantId == null) return;
        map[String(it.productVariantId)] = {
          qty: Number(it.quantity) || 1,
          cartId: it.cartId,
          productId: it.productId,
        };
      });
      setCartQtyMap(map);
      dispatch(setCartCount(cartData?.totalItemsInCart || items.length));
    },
    [dispatch],
  );

  const refreshCart = useCallback(async () => {
    if (!userId) return;
    try {
      applyCart(await getCart(userId));
    } catch {}
  }, [userId, applyCart]);

  const clearCart = useCallback(() => setCartQtyMap({}), []);

  const changeCartQty = useCallback(
    async (productId, variantId, delta) => {
      if (!userId || !variantId) return;
      const vid = String(variantId);
      const entry = cartQtyMap[vid];
      setCartBusyVariant(vid);
      try {
        if (delta > 0) {
          await apiPost(`${PHYSICAL_GOLD_BASE_URL}/cart/AddItemToCart`, {
            userId,
            productId: productId ?? entry?.productId,
            productVariantId: variantId,
            quantity: 1,
          });
        } else if (entry && entry.qty <= 1) {
          await apiDelete(`${PHYSICAL_GOLD_BASE_URL}/cart/${entry.cartId}`, {
            params: { userId },
          });
        } else if (entry) {
          await apiPost(`${PHYSICAL_GOLD_BASE_URL}/cart/decrementCartItems`, {
            userId,
            id: entry.cartId,
            productId: productId ?? entry.productId,
            productVariantId: variantId,
            quantity: 1,
          });
        }
        await refreshCart();
      } catch (err) {
        Alert.alert("Error", err?.message || "Could not update quantity. Please try again.");
      } finally {
        setCartBusyVariant(null);
      }
    },
    [userId, cartQtyMap, refreshCart],
  );

  const cartVariantIds = useMemo(() => new Set(Object.keys(cartQtyMap)), [cartQtyMap]);

  return {
    cartQtyMap,
    cartVariantIds,
    refreshCart,
    clearCart,
    changeCartQty,
    cartBusyVariant,
  };
}
