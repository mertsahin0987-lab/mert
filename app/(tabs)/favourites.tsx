import React from 'react';
import { StyleSheet, View, Text, FlatList, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useProducts } from '@/lib/DataContext';
import { useFavourites } from '@/components/FavouritesContext';
import ProductCard from '@/components/ProductCard';

export default function FavouritesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { favourites, isLoggedIn, setIsLoggedIn } = useFavourites();
  const products = useProducts();

  const favouriteProducts = products.filter(p => favourites.has(p.id));

  if (favouriteProducts.length === 0) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Feather name="heart" size={56} color={colors.border} />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          No favourites yet
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
          Tap the heart on any tool to save it here.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!isLoggedIn && (
        <Pressable
          onPress={() => setIsLoggedIn(true)}
          style={[styles.signInBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.bannerTitle, { color: colors.text }]}>Sign in to sync</Text>
            <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
              Keep your favourites across devices
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        </Pressable>
      )}
      <Text style={[styles.count, { color: colors.textSecondary }]}>
        {favouriteProducts.length} {favouriteProducts.length === 1 ? 'item' : 'items'}
      </Text>
      <FlatList
        data={favouriteProducts}
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
  signInBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  bannerText: {
    fontSize: 12,
    marginTop: 2,
  },
  count: {
    fontSize: 13,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
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
});
