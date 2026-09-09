import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ProductImageSlider = ({ images, containerHeight = 280 }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState({});
  const flatListRef = useRef(null);

  // Prepare image array - filter out null/empty URLs
  const imageArray = useMemo(() => {
    const views = [
      { key: 'frontViewUrl', label: 'Front' },
      { key: 'backViewUrl', label: 'Back' },
      { key: 'leftViewUrl', label: 'Left' },
      { key: 'rightViewUrl', label: 'Right' },
      { key: 'topViewUrl', label: 'Top' },
      { key: 'bottomViewUrl', label: 'Bottom' },
    ];

    return views
      .filter((view) => images?.[view.key])
      .map((view) => ({
        id: view.key,
        url: images[view.key],
        label: view.label,
      }));
  }, [images]);

  // Handle scroll end for pagination
  const handleScrollEnd = useCallback((event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentIndex(Math.min(index, imageArray.length - 1));
  }, [imageArray.length]);

  // Handle image error
  const handleImageError = useCallback((imageId) => {
    setImageErrors((prev) => ({ ...prev, [imageId]: true }));
  }, []);

  // Scroll to specific index
  const scrollToIndex = useCallback((index) => {
    if (flatListRef.current && imageArray.length > 0) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5,
      });
      setCurrentIndex(index);
    }
  }, [imageArray.length]);

  // Render single image item
  const renderImageItem = useCallback(
    ({ item, index }) => {
      const hasError = imageErrors[item.id];

      return (
        <View style={[styles.imageContainer, { width: SCREEN_WIDTH }]}>
          {hasError ? (
            <View style={styles.errorPlaceholder}>
              <View style={styles.errorIconBox}>
                <Text style={styles.errorIcon}>🖼️</Text>
              </View>
            </View>
          ) : (
            <Image
              source={{ uri: item.url }}
              style={styles.image}
              resizeMode="contain"
              onError={() => handleImageError(item.id)}
            />
          )}
        </View>
      );
    },
    [imageErrors, handleImageError],
  );

  // No images case
  if (imageArray.length === 0) {
    return (
      <View style={[styles.hero, { height: containerHeight }]}>
        <View style={styles.noImagePlaceholder}>
          <Text style={styles.noImageIcon}>🪙</Text>
        </View>
      </View>
    );
  }

  // Single image case (no slider needed)
  if (imageArray.length === 1) {
    return (
      <View style={[styles.hero, { height: containerHeight }]}>
        <Image
          source={{ uri: imageArray[0].url }}
          style={styles.image}
          resizeMode="contain"
          onError={() => handleImageError(imageArray[0].id)}
        />
      </View>
    );
  }

  // Multiple images - render slider with dots
  return (
    <View style={[styles.hero, { height: containerHeight }]}>
      {/* Image Slider */}
      <FlatList
        ref={flatListRef}
        data={imageArray}
        renderItem={renderImageItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScrollEnd}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={imageArray.length > 1}
        decelerationRate="fast"
      />

      {/* Pagination Dots */}
      <View style={styles.dotsContainer}>
        {imageArray.map((_, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dot,
              index === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
            onPress={() => scrollToIndex(index)}
            activeOpacity={0.7}
          />
        ))}
      </View>

      {/* Image Counter (optional) */}
      <View style={styles.counterContainer}>
        <Text style={styles.counterText}>
          {currentIndex + 1} / {imageArray.length}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    backgroundColor: '#F8F7F6',
    borderRadius: 0,
    overflow: 'hidden',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  imageContainer: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F7F6',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  // Pagination dots
  dotsContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(14,107,87, 0.3)',
  },

  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0E6B57',
  },

  dotInactive: {
    backgroundColor: 'rgba(14,107,87, 0.25)',
  },

  // Image counter
  counterContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  counterText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Error & empty states
  errorPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F7F6',
  },

  errorIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F7F4ED',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4BB67',
  },

  errorIcon: {
    fontSize: 36,
  },

  noImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F7F6',
  },

  noImageIcon: {
    fontSize: 48,
  },
});

export default ProductImageSlider;
