import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { getAllImageUrls, getPrimaryImage } from '../utils/imageUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * ProductImageGallery - Display all product image views
 * @param {Object} imageObj - Image object with multiple view URLs
 * @param {number} height - Gallery height (default: 300)
 */
const ProductImageGallery = ({ imageObj, height = 300 }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const images = getAllImageUrls(imageObj);
  const primaryImage = getPrimaryImage(imageObj);

  if (!primaryImage) {
    return (
      <View style={[styles.container, { height }]}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No images available</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      {/* Main Image Display */}
      <View style={[styles.mainImageContainer, { height: height * 0.85 }]}>
        <Image
          source={{ uri: images[selectedIndex]?.url || primaryImage }}
          style={styles.mainImage}
          resizeMode="contain"
        />
      </View>

      {/* Image Thumbnails */}
      {images.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.thumbnailContainer}
        >
          {images.map((img, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => setSelectedIndex(idx)}
              style={[
                styles.thumbnail,
                selectedIndex === idx && styles.thumbnailActive,
              ]}
              activeOpacity={0.7}
            >
              <Image
                source={{ uri: img.url }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
              <Text style={styles.thumbnailLabel}>{img.type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F3EE',
    borderRadius: 12,
    overflow: 'hidden',
  },
  mainImageContainer: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EBE8E1',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: '#A8ABBE',
  },
  thumbnailContainer: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EBE8E1',
    overflow: 'hidden',
  },
  thumbnailActive: {
    borderColor: '#D4A843',
    borderWidth: 2,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailLabel: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    right: 2,
    fontSize: 8,
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 2,
    textAlign: 'center',
  },
});

export default ProductImageGallery;
