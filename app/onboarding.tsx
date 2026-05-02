import React, { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useOnboarding } from '@/components/OnboardingContext';

type Slide = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'scissors',
    title: 'All your barber tools, in one place',
    body: 'Browse clippers, trimmers, shavers and more — from every brand worth knowing.',
  },
  {
    icon: 'tag',
    title: 'Find the best price, instantly',
    body: 'See live prices from trusted retailers side by side, so you never overpay.',
  },
  {
    icon: 'bell',
    title: 'Never miss a release',
    body: 'Save favourites and get notified when new tools drop or come back in stock.',
  },
];

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { completeOnboarding } = useOnboarding();
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  const goToPage = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * width, animated: true });
    setPage(idx);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    if (idx !== page) setPage(idx);
  };

  const finish = () => {
    completeOnboarding();
    router.replace('/(tabs)');
  };

  const isLast = page === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top bar: brand + skip */}
      <View style={styles.topBar}>
        <Text style={[styles.brand, { color: colors.text }]}>MySection</Text>
        {!isLast && (
          <Pressable onPress={finish} hitSlop={10}>
            <Text style={[styles.skip, { color: colors.textSecondary }]}>Skip</Text>
          </Pressable>
        )}
      </View>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.slides}
      >
        {SLIDES.map((slide, idx) => (
          <View key={idx} style={[styles.slide, { width }]}>
            <View
              style={[
                styles.iconWrap,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Feather name={slide.icon} size={56} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              {slide.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, idx) => (
          <Pressable
            key={idx}
            onPress={() => goToPage(idx)}
            hitSlop={8}
            style={[
              styles.dot,
              {
                backgroundColor: idx === page ? colors.accent : colors.border,
                width: idx === page ? 22 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* CTAs */}
      <View style={styles.ctaBlock}>
        <Pressable
          onPress={() => (isLast ? finish() : goToPage(page + 1))}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.primaryBtnText}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>
        {isLast && (
          <Pressable onPress={finish} hitSlop={10} style={styles.signInRow}>
            <Text style={[styles.signInText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
              <Text style={{ color: colors.accent, fontWeight: '600' }}>Sign in</Text>
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 54 : 30,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  brand: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  skip: {
    fontSize: 14,
    fontWeight: '500',
  },
  slides: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  iconWrap: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 30,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  ctaBlock: {
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  signInRow: {
    alignItems: 'center',
    marginTop: 16,
  },
  signInText: {
    fontSize: 14,
  },
});
