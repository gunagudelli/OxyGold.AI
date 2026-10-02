import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  InteractionManager,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getProductImages, getProductVariants } from '../api/physicalGoldApi';
import { resolveImageUrl } from '../utils/resolveImageUrl';
import PgActionButton from './PgActionButton';
import PgQtyStepper from './PgQtyStepper';

const ProductCard = ({
  product,
  onPress,
  isInWishlist,
  onWishlistToggle,
  onAddToCart,
  addingCart,
  cartVariantIds, // Set<string> of variant ids currently in the cart
  // With these, an in-cart item shows a − qty + stepper instead of "In Cart":
  // cartQtyMap { [variantId]: { qty } }, onChangeQty(productId, variantId, ±1),
  // qtyBusyVariant = variant id whose quantity is being updated.
  cartQtyMap,
  onChangeQty,
  qtyBusyVariant,
  // When provided, replaces the Add-to-Cart button with a "Buy Now" button
  // that adds this variant to the cart and jumps straight to Checkout —
  // takes priority over onAddToCart so a card only ever shows one CTA.
  onBuyNow,
  buyingNow,
  // Optional override for the image box's aspect ratio (default 1, square)
  // — lets one screen show a smaller image without affecting every other
  // screen that uses this same card.
  imageAspectRatio,
  // Flat look — square corners, thin border, no shadow — for lists where
  // cards sit edge to edge (category product list).
  flat,
}) => {
  const [imgError, setImgError]   = useState(false);
  const [imageUrl, setImageUrl]   = useState(
    resolveImageUrl(product?.imageUrl || product?.image)
  );

  // Some screens (Search) already fetch products with their first variant —
  // mrp, price, stock, sku — embedded right on the product object. When
  // that's there, use it directly instead of firing a separate network
  // request just to re-discover data the caller already handed us.
  const embeddedVariant = product?.variants?.[0] || null;

  const [offer, setOffer] = useState(() => {
    const mrp = embeddedVariant?.mrp || 0;
    const price = embeddedVariant?.price || 0;
    if (mrp > price && price > 0) {
      return {
        mrpDisplay: mrp.toLocaleString('en-IN'),
        discountPct: Math.round(((mrp - price) / mrp) * 100),
      };
    }
    return null;
  }); // { mrpDisplay, discountPct }
  // The product itself can have several variants (different weights), each
  // its own price — "Add to Cart" here always adds this one, the cheapest/
  // first variant, and shows its weight so it's never a silent guess.
  const [defaultVariant, setDefaultVariant] = useState(() =>
    embeddedVariant?.id
      ? { id: embeddedVariant.id, weight: embeddedVariant.weight || null }
      : null,
  ); // { id, weight }
  const heartScale = useRef(new Animated.Value(1)).current;

  const inCart = !!(defaultVariant && cartVariantIds?.has(String(defaultVariant.id)));

  // ── Safe field reads — covers every common API shape ─────────────────────
  const name   = product?.productName
               || product?.name
               || product?.title
               || 'Gold Product';

  const rawPrice = embeddedVariant?.price
                || product?.minPrice
                || product?.priceRange
                || product?.price
                || product?.basePrice
                || product?.amount
                || '';

  const purity = product?.purity || product?.goldPurity || null;

  const status = product?.status || product?.productStatus || '';

  // green badge when active / in-stock
  const isActive = !!status &&
    ['active', 'in stock', 'available', 'in_stock', 'instock']
      .some(k => status.toLowerCase().includes(k));

  // ── Format price properly ─────────────────────────────────────────────────
  let priceDisplay = null;
  if (rawPrice) {
    if (typeof rawPrice === 'number') {
      priceDisplay = rawPrice.toLocaleString('en-IN');
    } else {
      // strip any existing ₹ or commas, re-format if it's a plain number string
      const cleaned = String(rawPrice).replace(/₹|,/g, '').trim();
      const num = parseFloat(cleaned);
      if (!isNaN(num)) {
        priceDisplay = num.toLocaleString('en-IN');
      } else {
        // already a formatted range like "₹1,200 – ₹1,800" — show as-is
        priceDisplay = String(rawPrice).replace(/^₹/, '');
      }
    }
  }

  // ── Fetch image from API if not on the product object ─────────────────────
  // Deferred with InteractionManager so a whole grid of cards mounting at once
  // (the products list isn't truly virtualized — see PgHomeScreen) doesn't
  // fire dozens of concurrent requests on the same tick and stall the JS
  // thread mid-scroll.
  useEffect(() => {
    if (!imageUrl && product?.id) {
      const task = InteractionManager.runAfterInteractions(() => {
        getProductImages(product.id)
          .then(imgObj => {
            const url = imgObj?.frontViewUrl
                     || imgObj?.imageUrl
                     || imgObj?.url
                     || null;
            if (url) setImageUrl(url);
          })
          .catch(() => {});
      });
      return () => task.cancel();
    }
  }, [product?.id]);

  // ── Offer badge — MRP vs. selling price lives on the variant, not the product ──
  // Skipped entirely when the caller already embedded variant data (Search) —
  // that's already been used to seed state above.
  useEffect(() => {
    if (!product?.id || embeddedVariant) return;
    const task = InteractionManager.runAfterInteractions(() => {
      getProductVariants(product.id)
        .then((res) => {
          const inner = res?.data || res;
          const list  = inner?.listVariantResponse || inner?.variants || (Array.isArray(inner) ? inner : []);
          const v     = list?.[0];
          const mrp   = v?.mrp || 0;
          const price = v?.price || 0;
          if (mrp > price && price > 0) {
            setOffer({
              mrpDisplay: mrp.toLocaleString('en-IN'),
              discountPct: Math.round(((mrp - price) / mrp) * 100),
            });
          }
          if (v?.id) {
            setDefaultVariant({ id: v.id, weight: v?.weight || v?.weightInGrams || null });
          }
        })
        .catch(() => {});
    });
    return () => task.cancel();
  }, [product?.id]);

  // ── Heart bounce ──────────────────────────────────────────────────────────
  // onPress/onWishlistToggle are stable parent callbacks (useCallback, no
  // per-item args baked in) so the .map() at the call site can pass the same
  // function reference to every card instead of a fresh closure each render
  // — that's what lets React.memo below actually skip re-rendering cards
  // that didn't change.
  const handleWishlist = () => {
    if (!onWishlistToggle) return;
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.35, useNativeDriver: true, speed: 50 }),
      Animated.spring(heartScale, { toValue: 1,    useNativeDriver: true, speed: 50 }),
    ]).start();
    onWishlistToggle(product);
  };

  return (
    <TouchableOpacity style={[s.card, flat && s.cardFlat]} onPress={() => onPress?.(product)} activeOpacity={0.9}>

      {/* ── Image — white tile, contained product shot ─────────────────────── */}
      <View style={[s.imageWrap, imageAspectRatio ? { aspectRatio: imageAspectRatio } : null]}>
        {imageUrl && !imgError ? (
          <Image
            source={{ uri: imageUrl }}
            style={s.image}
            resizeMode="contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={s.fallback}>
            <Ionicons name="diamond-outline" size={32} color="#C8962E" />
          </View>
        )}

        {/* Top left — discount first (it's what sells); otherwise a
            non-active status such as "Out of stock". "Active" is the normal
            state, so it isn't badged. */}
        {offer ? (
          <View style={s.offBadge}>
            <Text style={s.offBadgeText}>{offer.discountPct}% OFF</Text>
          </View>
        ) : !!status && !isActive ? (
          <View style={s.badgeDark}>
            <Text style={s.badgeDarkText}>{status}</Text>
          </View>
        ) : null}

        {/* Wishlist — top right */}
        {onWishlistToggle && (
          <TouchableOpacity
            style={s.wishBtn}
            onPress={handleWishlist}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={isInWishlist ? 'heart' : 'heart-outline'}
                size={16}
                color={isInWishlist ? '#C85A54' : '#7A7A80'}
              />
            </Animated.View>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Name, purity, price, action ────────────────────────────────────── */}
      <View style={s.info}>
        <Text style={s.name} numberOfLines={2} ellipsizeMode="tail">
          {name}
        </Text>

        {purity && (
          <View style={s.metaRow}>
            <View style={s.metaBadge}>
              <Text style={s.metaText}>{purity}</Text>
            </View>
          </View>
        )}

        {/* Price on its own line with the MRP beside it — the action button
            gets the full width below instead of squeezing the price. */}
        <View style={s.priceBlock}>
          {priceDisplay ? (
            <View style={s.priceRow}>
              <Text style={s.priceRupee}>₹</Text>
              <Text style={s.priceAmount} numberOfLines={1}>{priceDisplay}</Text>
              {offer && (
                <Text style={s.priceStrike} numberOfLines={1}>₹{offer.mrpDisplay}</Text>
              )}
            </View>
          ) : (
            /* keeps card height consistent when price is missing */
            <Text style={s.priceNA}>Price on request</Text>
          )}
        </View>

        {onBuyNow ? (
          <PgActionButton
            label="Buy Now"
            onPress={() => onBuyNow(product, defaultVariant)}
            disabled={!defaultVariant}
            loading={buyingNow}
            style={s.cta}
          />
        ) : onAddToCart && !inCart ? (
          <PgActionButton
            label="Add to Cart"
            onPress={() => onAddToCart(product, defaultVariant)}
            disabled={!defaultVariant}
            loading={addingCart}
            style={s.cta}
          />
        ) : onAddToCart && onChangeQty ? (
          <PgQtyStepper
            qty={cartQtyMap?.[String(defaultVariant?.id)]?.qty || 1}
            loading={qtyBusyVariant === String(defaultVariant?.id)}
            onIncrement={() => onChangeQty(product?.id, defaultVariant?.id, 1)}
            onDecrement={() => onChangeQty(product?.id, defaultVariant?.id, -1)}
            style={s.cta}
          />
        ) : onAddToCart ? (
          <TouchableOpacity
            style={[s.cta, s.inCartBtn]}
            onPress={() => onAddToCart(product, defaultVariant)}
            disabled={addingCart}
            activeOpacity={0.82}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {addingCart ? (
              <ActivityIndicator size="small" color="#176B4D" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={14} color="#176B4D" />
                <Text style={s.inCartText}>In Cart</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[s.cta, s.detailsBtn]}
            onPress={() => onPress?.(product)}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 4, left: 8, right: 8 }}
          >
            <Text style={s.detailsBtnText}>View Details</Text>
          </TouchableOpacity>
        )}
      </View>

    </TouchableOpacity>
  );
};

const s = StyleSheet.create({

  // ── Card shell — rounded, hairline border, whisper of shadow ──────────────
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEE8E0',
    shadowColor: '#2A1F4A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  cardFlat: {
    borderRadius: 0,
    borderColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },

  // ── Image area — square tile on plain white ───────────────────────────────
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
    overflow: 'hidden',
    padding: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Discount badge — top left on the image ────────────────────────────────
  offBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#D84315', // orange-red — reads as "sale", unlike green
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  offBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // ── Other status badge (e.g. out of stock) ────────────────────────────────
  badgeDark: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(34,30,28,0.65)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeDarkText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // ── Wishlist ───────────────────────────────────────────────────────────────
  wishBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(34,30,28,0.18)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },

  // ── Info ───────────────────────────────────────────────────────────────────
  info: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    lineHeight: 18,
    minHeight: 36, // two lines, so cards in a row line up
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 6,
  },
  metaBadge: {
    backgroundColor: '#F7F1E6',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  metaText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8B5A2B',
  },
  priceBlock: {
    flex: 1,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  priceRupee: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0E6B57',
  },
  priceAmount: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0E6B57',
    lineHeight: 19,
    flexShrink: 1,
  },
  priceStrike: {
    fontSize: 11,
    color: '#C0392B',
    textDecorationLine: 'line-through',
    fontWeight: '600',
    marginLeft: 6,
    flexShrink: 1,
  },
  priceNA: {
    fontSize: 11,
    color: '#A79C93',
    fontStyle: 'italic',
    lineHeight: 19,
  },

  // ── Action — full card width under the price ──────────────────────────────
  cta: { marginTop: 10, height: 34 },
  inCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 20,
    borderWidth: 1.3,
    backgroundColor: '#EAF3EE',
    borderColor: '#B7D2C2',
  },
  inCartText: { fontSize: 12, fontWeight: '700', color: '#176B4D', textTransform: 'uppercase' },
  detailsBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D6C7F2',
    backgroundColor: '#F3ECFA',
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6C4AB6',
  },
});

export default React.memo(ProductCard);
