import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  ScrollView,
} from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { categories } from '@/constants/MockData';
import { useProducts } from '@/lib/DataContext';
import ProductCard from '@/components/ProductCard';

type SortOption = 'relevance' | 'price_low' | 'price_high' | 'name';

export default function SearchScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const products = useProducts();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [showSortMenu, setShowSortMenu] = useState(false);

  const filtered = useMemo(() => {
    let result = [...products];

    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (selectedCategory) {
      result = result.filter(p => p.category === selectedCategory);
    }

    switch (sortBy) {
      case 'price_low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [query, selectedCategory, sortBy]);

  const sortLabels: Record<SortOption, string> = {
    relevance: 'Relevance',
    price_low: 'Price: Low to High',
    price_high: 'Price: High to Low',
    name: 'Name: A-Z',
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.searchBar }]}>
          <FontAwesome name="search" size={16} color={colors.placeholder} style={{ marginRight: 10 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search tools, brands..."
            placeholderTextColor={colors.placeholder}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <FontAwesome name="times-circle" size={16} color={colors.placeholder} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        <Pressable
          onPress={() => setSelectedCategory(null)}
          style={[
            styles.categoryPill,
            {
              backgroundColor: !selectedCategory ? colors.text : colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.categoryText,
              { color: !selectedCategory ? colors.background : colors.textSecondary },
            ]}
          >
            All
          </Text>
        </Pressable>
        {categories.map(cat => (
          <Pressable
            key={cat.id}
            onPress={() => setSelectedCategory(selectedCategory === cat.name ? null : cat.name)}
            style={[
              styles.categoryPill,
              {
                backgroundColor: selectedCategory === cat.name ? colors.text : colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <FontAwesome
              name={cat.icon as any}
              size={12}
              color={selectedCategory === cat.name ? colors.background : colors.textSecondary}
              style={{ marginRight: 6 }}
            />
            <Text
              style={[
                styles.categoryText,
                { color: selectedCategory === cat.name ? colors.background : colors.textSecondary },
              ]}
            >
              {cat.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Sort & Filter Row */}
      <View style={styles.filterRow}>
        <Text style={[styles.resultCount, { color: colors.textSecondary }]}>
          {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
        </Text>
        <Pressable
          style={[styles.sortButton, { borderColor: colors.border }]}
          onPress={() => setShowSortMenu(!showSortMenu)}
        >
          <FontAwesome name="sort" size={14} color={colors.textSecondary} />
          <Text style={[styles.sortText, { color: colors.text }]}>{sortLabels[sortBy]}</Text>
        </Pressable>
      </View>

      {/* Sort Menu Dropdown */}
      {showSortMenu && (
        <View style={[styles.sortMenu, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          {(Object.keys(sortLabels) as SortOption[]).map(option => (
            <Pressable
              key={option}
              style={[styles.sortMenuItem, { borderBottomColor: colors.border }]}
              onPress={() => {
                setSortBy(option);
                setShowSortMenu(false);
              }}
            >
              <Text
                style={[
                  styles.sortMenuText,
                  { color: sortBy === option ? colors.accent : colors.text },
                ]}
              >
                {sortLabels[option]}
              </Text>
              {sortBy === option && (
                <FontAwesome name="check" size={14} color={colors.accent} />
              )}
            </Pressable>
          ))}
        </View>
      )}

      {/* Results Grid */}
      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <FontAwesome name="search" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No tools found
            </Text>
          </View>
        }
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  resultCount: {
    fontSize: 13,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  sortText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sortMenu: {
    position: 'absolute',
    top: 145,
    right: 20,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 100,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  sortMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  sortMenuText: {
    fontSize: 14,
    fontWeight: '500',
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
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
