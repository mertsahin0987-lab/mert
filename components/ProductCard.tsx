import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useRouter } from 'expo-router';
import { Product } from '@/constants/MockData';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useFavourites } from '@/components/FavouritesContext';
import { useCurrency } from '@/components/CurrencyContext';

type Props = {
  product: Product;
};

// Every ProductCard renders at exactly these dimensions across the whole app.
export const CARD_WIDTH = 165;
const IMAGE_HEIGHT = 150;
const NAME_LINES = 2;
const NAME_LINE_HEIGHT = 18;

export default function ProductCard({ product }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { toggleFavourite, isFavourite } = useFavourites();
  const { formatPrice } = useCurrency();
  const liked = isFavourite(product.id);

  const storesInStock = product.stores.filter(s => s.inStock).length;
  const lowestPrice = Math.min(...product.stores.filter(s => s.inStock).map(s => s.price));

  const handleFavourite = (e: any) => {
    e?.stopPropagation?.();
    toggleFavourite(product.id);
  };

  const handleOpen = () => {
    router.push(`/product/${product.id}`);
  };

  return (
    <Pressable
      onPress={handleOpen}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.imageContainer, { backgroundColor: colors.surface }]}>
        <Image source={product.image} style={styles.image} resizeMode="contain" />
        <Pressable onPress={handleFavourite} style={styles.heartButton} hitSlop={8}>
          <FontAwesome
            name={liked ? 'heart' : 'heart-o'}
            size={18}
            color={liked ? colors.accent : colors.textSecondary}
          />
        </Pressable>
        {product.isNew && (
          <View style={[styles.badge, { backgroundColor: colors.accent }]}>
            <Text style={styles.badgeText}>NEW</Text>
          </View>
        )}
        {product.upcomingRelease && (
          <View style={[styles.badge, { backgroundColor: '#4A90D9' }]}>
            <Text style={styles.badgeText}>SOON</Text>
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={[styles.brand, { color: colors.textSecondary }]} numberOfLines={1}>
          {product.brand}
        </Text>
        <Text
          style={[styles.name, { color: colors.text }]}
          numberOfLines={NAME_LINES}
        >
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={[styles.price, { color: colors.text }]} numberOfLines={1}>
            {storesInStock > 0 ? formatPrice(lowestPrice) : 'Out of Stock'}
          </Text>
          {storesInStock > 0 && (
            <Text style={[styles.storeCount, { color: colors.textSecondary }]} numberOfLines={1}>
              {storesInStock} {storesInStock === 1 ? 'store' : 'stores'}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  imageContainer: {
    width: '100%',
    height: IMAGE_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    // Absolute pixel frame (not %) so every product renders in the exact same
    // canvas area regardless of the source PNG's aspect ratio.
    width: 120,
    height: 110,
  },
  heartButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  info: {
    padding: 10,
  },
  brand: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    height: 14,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: NAME_LINE_HEIGHT,
    // Reserve space for exactly NAME_LINES so every card is the same height.
    height: NAME_LINE_HEIGHT * NAME_LINES,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  storeCount: {
    fontSize: 11,
    marginLeft: 6,
  },
});
