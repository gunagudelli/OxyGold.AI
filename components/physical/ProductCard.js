import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
} from 'react-native';
import { PG_COLORS } from '../../constants/physicalGoldColors';
import { getProductImages } from '../../src/physicalGoldScreens/physicalGoldApi';

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
            resizeMode="contain"
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={s.fallback}>
            <Text style={s.fallbackEmoji}>🥇</Text>
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
            <Animated.Text style={[s.wishIcon, { transform: [{ scale: heartScale }] }]}>
              {isInWishlist ? '❤️' : '🤍'}
            </Animated.Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Name & Price ────────────────────────────────────────────────────── */}
      <View style={s.info}>
        {/* name — always 2 lines max, never clips */}
        <Text style={s.name} numberOfLines={2} ellipsizeMode="tail">
          {name}
        </Text>

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

      {/* ── Gold button — simple flat ────────────────────────────────────────── */}
      <View style={s.btnWrap}>
        <View style={s.btn}>
          <Text style={s.btnText}>View Details</Text>
        </View>
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
    borderWidth: 1,
    borderColor: '#EBE8E1',
    shadowColor: 'rgba(26,28,46,0.09)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
  },

  // ── Image area — bigger height, minimal padding ────────────────────────────
  imageWrap: {
    width: '100%',
    height: 175,             // taller than before (was 155)
    backgroundColor: '#F8F6F2',
    padding: 6,              // just enough so product doesn't kiss edges
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',          // fills the padded area with contain
  },
  fallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackEmoji: { fontSize: 40 },

  // ── Active green badge ─────────────────────────────────────────────────────
  badgeActive: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#059669',
  },
  badgeActiveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },

  // ── Other status badge ─────────────────────────────────────────────────────
  badgeDark: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(26,28,46,0.65)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeDarkText: {
    fontSize: 9,
    fontWeight: '800',
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
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: '#EBE8E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wishIcon: { fontSize: 15, lineHeight: 18 },

  // ── Info ───────────────────────────────────────────────────────────────────
  info: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 4,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1C2E',
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 1,
  },
  priceRupee: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A0720A',
  },
  priceAmount: {
    fontSize: 15,           // slightly larger so price is easy to read
    fontWeight: '900',
    color: '#A0720A',
    lineHeight: 19,
  },
  priceNA: {
    fontSize: 11,
    color: '#A8ABBE',
    fontStyle: 'italic',
  },

  // ── Gold button — simple flat gold ────────────────────────────────────────
  btnWrap: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  btn: {
    backgroundColor: '#D4A843',   // app's gold
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1C2340',             // dark navy on gold — high contrast
    letterSpacing: 0.2,
  },
});

export default ProductCard;