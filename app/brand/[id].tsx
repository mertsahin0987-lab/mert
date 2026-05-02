import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useData } from '@/lib/DataContext';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import ProductCard from '@/components/ProductCard';

export default function BrandScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { products, brands } = useData();

  const brand = brands.find(b => b.id === id);
  const brandProducts = brand
    ? products.filter(p => p.brand === brand.name)
    : [];

  if (!brand) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={[styles.notFoundTitle, { color: colors.text }]}>Brand not found</Text>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backCta, { backgroundColor: colors.accent }]}
        >
          <Text style={styles.backCtaText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={styles.iconButton} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {brand.name}
        </Text>
        <View style={styles.iconButton} />
      </View>

      {/* Brand hero */}
      <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.logoWrap, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <Image source={brand.logo} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={styles.heroText}>
          <Text style={[styles.heroName, { color: colors.text }]}>{brand.name}</Text>
          <Text style={[styles.heroCount, { color: colors.textSecondary }]}>
            {brandProducts.length} {brandProducts.length === 1 ? 'product' : 'products'}
          </Text>
        </View>
      </View>

      {/* Product grid */}
      {brandProducts.length === 0 ? (
        <View style={[styles.centered, { flex: 1 }]}>
          <Feather name="package" size={56} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No products yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Check back soon for new {brand.name} tools.
          </Text>
        </View>
      ) : (
        <FlatList
          data={brandProducts}
          numColumns={2}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.gridCell}>
              <ProductCard product={item} />
            </View>
          )}
        />
      )}
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    marginRight: 14,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  heroText: {
    flex: 1,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  heroCount: {
    fontSize: 13,
  },
  grid: {
    paddingHorizontal: 14,
    paddingBottom: 20,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  gridCell: {
    // One card on the left, one on the right — spacing handled by gridRow.
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});
