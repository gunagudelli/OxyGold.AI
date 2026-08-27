import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getProductImages } from '../screens/physicalGoldApi';

const ProductCard = ({ product, onPress, isInWishlist, onWishlistToggle }) => {
  const [imgError, setImgError]   = useState(false);
  const [imageUrl, setImageUrl]   = useState(
    product?.imageUrl || product?.image || null
  );
  const heartScale = useRef(new Animated.Value(1)).current;

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

  const weight = product?.weight || product?.weightInGrams || null;
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
  useEffect(() => {
    if (!imageUrl && product?.id) {
      getProductImages(product.id)
        .then(imgObj => {
          const url = imgObj?.frontViewUrl
                   || imgObj?.imageUrl
                   || imgObj?.url
                   || null;
          if (url) setImageUrl(url);
        })
        .catch(() => {});
    }
  }, [product?.id]);

  // ── Heart bounce ──────────────────────────────────────────────────────────
  const handleWishlist = () => {
    if (!onWishlistToggle) return;
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.35, useNativeDriver: true, speed: 50 }),
      Animated.spring(heartScale, { toValue: 1,    useNativeDriver: true, speed: 50 }),
    ]).start();
    onWishlistToggle();
  };

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.88}>

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
                size={19}
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
                <Ionicons name="scale-outline" size={10} color="#CF8B17" style={{ marginRight: 3 }} />
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

        {/* price */}
        {priceDisplay ? (
          <View style={s.priceRow}>
            <Text style={s.priceRupee}>₹</Text>
            <Text style={s.priceAmount}>{priceDisplay}</Text>
          </View>
        ) : (
          /* keeps card height consistent when price is missing */
          <Text style={s.priceNA}>Price on request</Text>
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
    height: 340,  // Fixed height for all cards
  },

  // ── Image area — full width like category cards ────────────────────────────
  imageWrap: {
    width: '100%',
    height: 220,
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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },

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
});

export default React.memo(ProductCard);