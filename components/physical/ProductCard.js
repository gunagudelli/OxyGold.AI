import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { PG_COLORS } from '../../constants/physicalGoldColors';
import { getProductImages } from '../../src/physicalGoldScreens/physicalGoldApi';

const ProductCard = ({ product, onPress, isInWishlist, onWishlistToggle }) => {
  const [imgError, setImgError] = useState(false);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || product?.image || null);

  const name = product?.productName || product?.name || 'Gold Product';
  const price = product?.priceRange || product?.price || '';
  const status = product?.status || '';

  // Fetch image from API if not already present
  useEffect(() => {
    if (!imageUrl && product?.id) {
      getProductImages(product.id)
        .then(imgObj => {
          if (imgObj?.frontViewUrl) {
            setImageUrl(imgObj.frontViewUrl);
          }
        })
        .catch(() => {});
    }
  }, [product?.id, imageUrl]);

  const displayImage = imageUrl || 'https://via.placeholder.com/150?text=Gold';

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.85}>
      {/* Image */}
      <View style={s.thumb}>
        {displayImage && !imgError ? (
          <Image 
            source={{ uri: displayImage }} 
            style={s.image} 
            resizeMode="cover" 
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={s.fallback}>
            <Text style={s.fallbackEmoji}>🥇</Text>
          </View>
        )}
        {status ? (
          <View style={s.statusBadge}>
            <Text style={s.statusText}>{status}</Text>
          </View>
        ) : null}
        {/* Wishlist Button */}
        {onWishlistToggle && (
          <TouchableOpacity
            style={s.wishlistBtn}
            onPress={onWishlistToggle}
            activeOpacity={0.7}
          >
            <Text style={s.wishlistIcon}>{isInWishlist ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info */}
      <View style={s.info}>
        <Text style={s.name} numberOfLines={2}>{name}</Text>
        {price ? (
          <Text style={s.price}>
            {typeof price === 'number' ? `₹${Number(price).toLocaleString('en-IN')}` : price}
          </Text>
        ) : null}
      </View>

      {/* View Details Button */}
      <View style={s.viewBtn}>
        <Text style={s.viewBtnText}>View Details</Text>
      </View>
    </TouchableOpacity>
  );
};

const s = StyleSheet.create({
  card:          { backgroundColor: PG_COLORS.surface, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: PG_COLORS.border, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
  thumb:         { width: '100%', height: 120, backgroundColor: PG_COLORS.goldBg, position: 'relative' },
  image:         { width: '100%', height: '100%' },
  fallback:      { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  fallbackEmoji: { fontSize: 40 },
  statusBadge:   { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  statusText:    { fontSize: 9, fontWeight: '800', color: '#fff' },
  wishlistBtn:   { position: 'absolute', top: 6, left: 6, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center' },
  wishlistIcon:  { fontSize: 18 },
  info:          { padding: 10, paddingBottom: 8 },
  name:          { fontSize: 12, fontWeight: '700', color: PG_COLORS.darkGray, marginBottom: 3, lineHeight: 17 },
  price:         { fontSize: 13, fontWeight: '900', color: PG_COLORS.gold, marginBottom: 2 },
  viewBtn:       { backgroundColor: PG_COLORS.gold, paddingVertical: 9, alignItems: 'center' },
  viewBtnText:   { fontSize: 12, fontWeight: '800', color: '#fff' },
});

export default ProductCard;
