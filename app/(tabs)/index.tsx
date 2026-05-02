import React from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  FlatList,
  Image,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { useData } from '@/lib/DataContext';
import ProductCard from '@/components/ProductCard';

function SectionHeader({ title, colors }: { title: string; colors: typeof Colors.light }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <Pressable>
        <Text style={[styles.seeAll, { color: colors.textSecondary }]}>See All</Text>
      </Pressable>
    </View>
  );
}

// Shared spacer between horizontally-scrolling product cards
const CardSeparator = () => <View style={{ width: 12 }} />;

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { products, brands } = useData();

  const recommended = products.slice(0, 6);
  const trending = products.filter(p => p.trending);
  const newReleases = products.filter(p => p.isNew);
  const upcoming = products.filter(p => p.upcomingRelease);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Recommended For You */}
      <SectionHeader title="Recommended For You" colors={colors} />
      <FlatList
        data={recommended}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.horizontalList}
        ItemSeparatorComponent={CardSeparator}
        renderItem={({ item }) => <ProductCard product={item} />}
      />

      {/* Popular Brands */}
      <SectionHeader title="Popular Brands" colors={colors} />
      <FlatList
        data={brands}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.horizontalList}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/brand/${item.id}`)}
            style={({ pressed }) => [
              styles.brandCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Image source={item.logo} style={styles.brandLogo} resizeMode="contain" />
            <Text style={[styles.brandName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
          </Pressable>
        )}
      />

      {/* Trending Now */}
      <SectionHeader title="Trending Now" colors={colors} />
      <FlatList
        data={trending}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.horizontalList}
        ItemSeparatorComponent={CardSeparator}
        renderItem={({ item }) => <ProductCard product={item} />}
      />

      {/* New Releases */}
      {newReleases.length > 0 && (
        <>
          <SectionHeader title="New Releases" colors={colors} />
          <FlatList
            data={newReleases}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.horizontalList}
            ItemSeparatorComponent={CardSeparator}
            renderItem={({ item }) => <ProductCard product={item} />}
          />
        </>
      )}

      {/* Coming Soon */}
      {upcoming.length > 0 && (
        <>
          <SectionHeader title="Coming Soon" colors={colors} />
          <FlatList
            data={upcoming}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.horizontalList}
            ItemSeparatorComponent={CardSeparator}
            renderItem={({ item }) => <ProductCard product={item} />}
          />
        </>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  tagline: {
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '500',
  },
  horizontalList: {
    paddingLeft: 20,
    paddingRight: 8,
  },
  brandCard: {
    width: 90,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    padding: 8,
  },
  brandLogo: {
    width: 45,
    height: 45,
    marginBottom: 6,
  },
  brandName: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});
