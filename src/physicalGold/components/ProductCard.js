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
import { getProductImages, getProductVariants } from '../screens/physicalGoldApi';

const ProductCard = ({
  product,
  onPress,
  isInWishlist,
  onWishlistToggle,
  onAddToCart,
  addingCart,
  cartVariantIds, // Set<string> of variant ids currently in the cart
}) => {
  const [imgError, setImgError]   = useState(false);
  const [imageUrl, setImageUrl]   = useState(
    product?.imageUrl || product?.image || null
  );
  const [offer, setOffer] = useState(null); // { mrpDisplay, discountPct }
  // The product itself can have several variants (different weights), each
  // its own price — "Add to Cart" here always adds this one, the cheapest/
  // first variant, and shows its weight so it's never a silent guess.
  const [defaultVariant, setDefaultVariant] = useState(null); // { id, weight }
  const heartScale = useRef(new Animated.Value(1)).current;

  const inCart = !!(defaultVariant && cartVariantIds?.has(String(defaultVariant.id)));

  // ── Safe field reads — covers every common API shape ─────────────────────
  const name   = product?.productName
               || product?.name
               || product?.title
               || 'Gold Product';

  const rawPrice = product?.priceRange
                || product?.price
                || product?.basePrice
                || product?.amount
                || '';

  const weight = product?.weight || product?.weightInGrams || defaultVariant?.weight || null;
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
  useEffect(() => {
    if (!product?.id) return;
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
    <TouchableOpacity style={s.card} onPress={() => onPress?.(product)} activeOpacity={0.88}>

      {/* ── Image — taller, wider, less padding ────────────────────────────── */}
      <View style={s.imageWrap}>
        {imageUrl && !imgError ? (
          <Image
            source={{ uri: imageUrl }}
            style={s.image}
            resizeMode="cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={s.fallback}>
            <Ionicons name="diamond-outline" size={34} color="#CF8B17" />
          </View>
        )}

        {/* Status — top left */}
        {!!status && (
          isActive ? (
            <View style={s.badgeActive}>
              <View style={s.greenDot} />
              <Text style={s.badgeActiveText}>Active</Text>
            </View>
          ) : (
            <View style={s.badgeDark}>
              <Text style={s.badgeDarkText}>{status}</Text>
            </View>
          )
        )}

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

      {/* ── Name, Weight & Price ────────────────────────────────────────────────────── */}
      <View style={s.info}>
        {/* name — always 2 lines max, never clips */}
        <Text style={s.name} numberOfLines={2} ellipsizeMode="tail">
          {name}
        </Text>

        {/* weight & purity badges */}
        {(weight || purity) && (
          <View style={s.metaRow}>
            {weight && (
              <View style={s.metaBadge}>
                <Ionicons name="scale-outline" size={10} color="#0E6B57" style={{ marginRight: 3 }} />
                <Text style={s.metaText}>{weight}g</Text>
              </View>
            )}
            {purity && (
              <View style={s.metaBadge}>
                <Ionicons name="sparkles-outline" size={10} color="#CF8B17" style={{ marginRight: 3 }} />
                <Text style={s.metaText}>{purity}</Text>
              </View>
            )}
          </View>
        )}

        {/* price + offer, with a compact cart action on the right */}
        <View style={onAddToCart ? s.bottomRow : s.priceOnlyRow}>
          <View style={s.priceInfoBlock}>
            {priceDisplay ? (
              <View style={s.priceRow}>
                <Text style={s.priceRupee}>₹</Text>
                <Text style={s.priceAmount} numberOfLines={1}>{priceDisplay}</Text>
              </View>
            ) : (
              /* keeps card height consistent when price is missing */
              <Text style={s.priceNA}>Price on request</Text>
            )}
            {offer && (
              <View style={s.offerRow}>
                <Text style={s.priceStrike} numberOfLines={1}>₹{offer.mrpDisplay}</Text>
                <View style={s.offerPill}>
                  <Text style={s.offerPillText} numberOfLines={1}>{offer.discountPct}% OFF</Text>
                </View>
              </View>
            )}
          </View>

          {onAddToCart && (
            <TouchableOpacity
              style={[s.cartBtn, inCart && s.cartBtnInCart]}
              onPress={() => onAddToCart(product, defaultVariant)}
              disabled={addingCart || (!inCart && !defaultVariant)}
              activeOpacity={0.82}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              {addingCart ? (
                <ActivityIndicator size="small" color={inCart ? '#0E6B57' : '#fff'} />
              ) : inCart ? (
                <>
                  <Ionicons name="checkmark-circle" size={13} color="#0E6B57" />
                  <Text style={[s.cartBtnText, s.cartBtnTextInCart]}>In Cart</Text>
                </>
              ) : (
                <>
                  <Ionicons name="cart-outline" size={13} color="#fff" />
                  <Text style={s.cartBtnText}>Add</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* View Details — own full-width row below price/offer instead of
            squeezed beside them, so a strikethrough price + discount pill
            never has to fight the button for horizontal space. */}
        {!onAddToCart && (
          <TouchableOpacity
            style={s.detailsBtnFull}
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

  // ── Card shell ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: 'rgba(34,30,28,0.09)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },

  // ── Image area — square, so it scales correctly with the card's real width ──
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F7F4ED',
    position: 'relative',
    overflow: 'hidden',
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
    backgroundColor: 'rgba(207,139,23,0.06)',
  },

  // ── Active green badge ─────────────────────────────────────────────────────
  badgeActive: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2ECC71',
  },
  badgeActiveText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1F8A4C',
  },

  // ── Other status badge ─────────────────────────────────────────────────────
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
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(34,30,28,0.15)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 2,
  },

  // ── Weight chip ──────────────────────────────────────────────────────────
  // ── Info ───────────────────────────────────────────────────────────────────
  info: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 6,
    flex: 1,  // Takes remaining space
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1C1C1E',
    lineHeight: 18,
    height: 36,  // Fixed height for 2 lines (18 * 2)
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F4F1',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  metaText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#7A7A80',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  priceRupee: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  priceAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    lineHeight: 20,
  },
  priceNA: {
    fontSize: 11,
    color: '#A79C93',
    fontStyle: 'italic',
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    maxWidth: '100%',
  },
  priceStrike: {
    fontSize: 11,
    color: '#C0392B',
    textDecorationLine: 'line-through',
    fontWeight: '600',
    flexShrink: 1,
  },
  offerPill: {
    backgroundColor: 'rgba(14,107,87,0.10)',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexShrink: 0,
  },
  offerPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#1C1C1E',
  },

  // ── Bottom row — price on the left, a compact "View Details" action on the right ──
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 6,
  },
  priceInfoBlock: { flex: 1, minWidth: 0 },
  // View-Details mode has no cart button beside the price, so this is just
  // the price/offer block with the same top spacing bottomRow would give it.
  priceOnlyRow: { marginTop: 8 },
  detailsBtnFull: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0E6B57',
    backgroundColor: '#fff',
    marginTop: 10,
  },
  detailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1C1C1E',
  },

  // ── Add to Cart chip — same footprint as detailsBtn, same pattern used
  // on the Wishlist screen's cards ──
  cartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#0E6B57',
  },
  cartBtnText: { fontSize: 11.5, fontWeight: '700', color: '#fff' },
  cartBtnInCart: {
    backgroundColor: 'rgba(14,107,87,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(14,107,87,0.20)',
  },
  cartBtnTextInCart: { color: '#0E6B57' },
});

export default React.memo(ProductCard);