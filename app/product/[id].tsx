import React from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Image,
  Pressable,
  Linking,
  Share,
  Platform,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { ColorVariant } from '@/constants/MockData';
import { useProducts } from '@/lib/DataContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useFavourites } from '@/components/FavouritesContext';
import { useCurrency } from '@/components/CurrencyContext';
import ProductCard from '@/components/ProductCard';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { toggleFavourite, isFavourite } = useFavourites();
  const { formatPrice } = useCurrency();
  const products = useProducts();

  const product = products.find(p => p.id === id);

  const [selectedColor, setSelectedColor] = React.useState<ColorVariant | null>(
    product?.colors?.[0] ?? null
  );

  if (!product) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={[styles.notFoundTitle, { color: colors.text }]}>Product not found</Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backCta, { backgroundColor: colors.accent }]}
        >
          <Text style={styles.backCtaText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const liked = isFavourite(product.id);

  // Build a "Similar Products" list: same category first, then top up with
  // same-brand products. Exclude the current product. Cap at 8.
  const similarProducts = React.useMemo(() => {
    const sameCategory = products.filter(
      p => p.id !== product.id && p.category === product.category
    );
    const sameBrand = products.filter(
      p =>
        p.id !== product.id &&
        p.brand === product.brand &&
        !sameCategory.some(sc => sc.id === p.id)
    );
    return [...sameCategory, ...sameBrand].slice(0, 8);
  }, [product.id, product.category, product.brand]);

  const inStockStores = product.stores.filter(s => s.inStock);
  const isInStock = inStockStores.length > 0;
  const lowestPrice = isInStock
    ? Math.min(...inStockStores.map(s => s.price))
    : Math.min(...product.stores.map(s => s.price));

  const handleShare = async () => {
    try {
      if (Platform.OS === 'web') {
        // navigator.share is not always available; fallback to clipboard-style alert
        if (typeof navigator !== 'undefined' && (navigator as any).share) {
          await (navigator as any).share({
            title: product.name,
            text: `Check out ${product.brand} ${product.name} on Clipprr`,
          });
        }
      } else {
        await Share.share({
          message: `Check out ${product.brand} ${product.name} on Clipprr`,
        });
      }
    } catch {
      // ignore share errors
    }
  };

  const handleStorePress = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const formatReleaseDate = (date?: string) => {
    if (!date) return null;
    try {
      return new Date(date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return date;
    }
  };

  const releaseLabel = formatReleaseDate(product.releaseDate);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={styles.iconButton} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => toggleFavourite(product.id)}
            style={styles.iconButton}
            hitSlop={8}
          >
            <FontAwesome
              name={liked ? 'heart' : 'heart-o'}
              size={20}
              color={liked ? colors.accent : colors.text}
            />
          </Pressable>
          <Pressable onPress={handleShare} style={styles.iconButton} hitSlop={8}>
            <Feather name="share" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Image area */}
        <View style={[styles.imageWrap, { backgroundColor: colors.surface }]}>
          <View
            style={[
              styles.stockBadge,
              { backgroundColor: isInStock ? '#2BA84A' : '#D33A3A' },
            ]}
          >
            <View style={styles.stockDot} />
            <Text style={styles.stockText}>{isInStock ? 'In Stock' : 'Out of Stock'}</Text>
          </View>
          {product.upcomingRelease && (
            <View style={[styles.soonBadge, { backgroundColor: '#4A90D9' }]}>
              <Text style={styles.stockText}>COMING SOON</Text>
            </View>
          )}
          <Image source={product.image} style={styles.image} resizeMode="contain" />
        </View>

        {/* Color variant boxes */}
        {product.colors && product.colors.length > 0 && (
          <View style={styles.colorRow}>
            <View style={styles.colorHeader}>
              <Text style={[styles.colorLabel, { color: colors.textSecondary }]}>
                Colour
              </Text>
              {selectedColor && (
                <Text style={[styles.colorName, { color: colors.text }]}>
                  {selectedColor.name}
                </Text>
              )}
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorScroll}
            >
              {product.colors.map(c => {
                const isActive = selectedColor?.name === c.name;
                return (
                  <Pressable
                    key={c.name}
                    onPress={() => {
                      if (c.productId && c.productId !== product.id) {
                        router.replace(`/product/${c.productId}`);
                      } else {
                        setSelectedColor(c);
                      }
                    }}
                    style={[
                      styles.variantBox,
                      {
                        backgroundColor: colors.surface,
                        borderColor: isActive ? colors.text : colors.border,
                        borderWidth: isActive ? 2 : 1,
                      },
                    ]}
                  >
                    {c.image ? (
                      <Image
                        source={c.image}
                        style={styles.variantImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={[styles.variantFill, { backgroundColor: c.hex }]} />
                    )}
                    <View style={[styles.variantDot, { backgroundColor: c.hex }]} />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Title block */}
        <View style={styles.titleBlock}>
          <Text style={[styles.brand, { color: colors.textSecondary }]}>
            {product.brand.toUpperCase()}
          </Text>
          <Text style={[styles.name, { color: colors.text }]}>{product.name}</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.fromLabel, { color: colors.textSecondary }]}>From</Text>
            <Text style={[styles.price, { color: colors.text }]}>
              {formatPrice(lowestPrice)}
            </Text>
          </View>
          {releaseLabel && (
            <Text style={[styles.releaseDate, { color: colors.textSecondary }]}>
              {product.upcomingRelease ? 'Releases ' : 'Released '}
              {releaseLabel}
            </Text>
          )}
        </View>

        {/* Available at */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Available at</Text>
          <View style={[styles.storeList, { borderColor: colors.border }]}>
            {product.stores.map((store, idx) => (
              <Pressable
                key={store.name}
                onPress={() => handleStorePress(store.url)}
                style={({ pressed }) => [
                  styles.storeRow,
                  idx < product.stores.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                  pressed && { backgroundColor: colors.surface },
                ]}
              >
                <View style={styles.storeLeft}>
                  <View
                    style={[
                      styles.storeDot,
                      { backgroundColor: store.inStock ? '#2BA84A' : '#D33A3A' },
                    ]}
                  />
                  <View>
                    <Text style={[styles.storeName, { color: colors.text }]}>
                      {store.name}
                    </Text>
                    <Text
                      style={[
                        styles.storeStatus,
                        { color: store.inStock ? '#2BA84A' : '#D33A3A' },
                      ]}
                    >
                      {store.inStock ? 'In stock' : 'Out of stock'}
                    </Text>
                  </View>
                </View>
                <View style={styles.storeRight}>
                  <Text style={[styles.storePrice, { color: colors.text }]}>
                    {formatPrice(store.price)}
                  </Text>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={colors.textSecondary}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Description */}
        {product.description && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Description</Text>
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {product.description}
            </Text>
          </View>
        )}

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <View style={styles.similarSection}>
            <Text style={[styles.sectionTitle, styles.similarTitle, { color: colors.text }]}>
              Similar Products
            </Text>
            <FlatList
              data={similarProducts}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.similarList}
              ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
              renderItem={({ item }) => <ProductCard product={item} />}
            />
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  backCta: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backCtaText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 54 : 18,
    paddingBottom: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    paddingBottom: 20,
  },
  imageWrap: {
    marginHorizontal: 16,
    borderRadius: 16,
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  stockBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  soonBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    marginRight: 6,
  },
  stockText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  image: {
    width: '78%',
    height: '78%',
  },
  colorRow: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  colorHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  colorLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginRight: 8,
  },
  colorName: {
    fontSize: 13,
    fontWeight: '600',
  },
  colorScroll: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  variantBox: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  variantImage: {
    width: '78%',
    height: '78%',
  },
  variantFill: {
    width: '78%',
    height: '78%',
    borderRadius: 8,
  },
  variantDot: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  titleBlock: {
    paddingHorizontal: 20,
    marginTop: 18,
  },
  brand: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  fromLabel: {
    fontSize: 13,
    marginRight: 6,
    marginBottom: 3,
  },
  price: {
    fontSize: 26,
    fontWeight: '700',
  },
  releaseDate: {
    fontSize: 12,
    marginTop: 6,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 26,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  storeList: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  storeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  storeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  storeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '600',
  },
  storeStatus: {
    fontSize: 11,
    marginTop: 2,
  },
  storeRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storePrice: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
  },
  similarSection: {
    marginTop: 28,
  },
  similarTitle: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  similarList: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
});
