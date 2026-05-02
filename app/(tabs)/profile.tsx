import React from 'react';
import { StyleSheet, View, Text, Pressable, ScrollView, Switch } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import { useTheme } from '@/components/ThemeContext';
import Colors from '@/constants/Colors';
import { useFavourites } from '@/components/FavouritesContext';
import { useOnboarding } from '@/components/OnboardingContext';
import { useCurrency } from '@/components/CurrencyContext';
import { useRouter } from 'expo-router';

function MenuRow({
  icon,
  label,
  colors,
  onPress,
  trailing,
}: {
  icon: React.ComponentProps<typeof FontAwesome>['name'];
  label: string;
  colors: typeof Colors.light;
  onPress?: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <Pressable style={[styles.menuRow, { borderBottomColor: colors.border }]} onPress={onPress}>
      <View style={styles.menuRowLeft}>
        <FontAwesome name={icon} size={18} color={colors.textSecondary} style={styles.menuIcon} />
        <Text style={[styles.menuLabel, { color: colors.text }]}>{label}</Text>
      </View>
      {trailing || <FontAwesome name="chevron-right" size={14} color={colors.placeholder} />}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { isDark, toggleTheme } = useTheme();
  const { isLoggedIn, setIsLoggedIn } = useFavourites();
  const { resetOnboarding } = useOnboarding();
  const { currency } = useCurrency();
  const router = useRouter();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={[styles.avatar, { backgroundColor: colors.surface }]}>
          <FontAwesome name="user" size={36} color={colors.textSecondary} />
        </View>
        {isLoggedIn ? (
          <>
            <Text style={[styles.name, { color: colors.text }]}>John Doe</Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>john@example.com</Text>
          </>
        ) : (
          <>
            <Text style={[styles.name, { color: colors.text }]}>Guest</Text>
            <Pressable
              style={[styles.signInButton, { backgroundColor: colors.text }]}
              onPress={() => setIsLoggedIn(true)}
            >
              <Text style={[styles.signInText, { color: colors.background }]}>Sign In</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACCOUNT</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <MenuRow icon="user" label="Edit Profile" colors={colors} />
          <MenuRow icon="lock" label="Change Password" colors={colors} />
          <MenuRow
            icon="bell"
            label="Alert Settings"
            colors={colors}
            onPress={() => router.push('/alert-settings')}
          />
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>PREFERENCES</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <MenuRow
            icon="moon-o"
            label="Dark Mode"
            colors={colors}
            trailing={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <MenuRow
            icon="money"
            label="Currency"
            colors={colors}
            onPress={() => router.push('/currency')}
            trailing={
              <View style={styles.trailingRow}>
                <Text style={[styles.trailingValue, { color: colors.textSecondary }]}>
                  {currency.code} · {currency.symbol}
                </Text>
                <FontAwesome name="chevron-right" size={14} color={colors.placeholder} />
              </View>
            }
          />
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUPPORT</Text>
        <View style={[styles.menuGroup, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <MenuRow icon="question-circle" label="Help Centre" colors={colors} />
          <MenuRow icon="envelope" label="Contact Us" colors={colors} />
          <MenuRow icon="file-text-o" label="Terms of Service" colors={colors} />
          <MenuRow icon="shield" label="Privacy Policy" colors={colors} />
          <MenuRow
            icon="refresh"
            label="Replay onboarding"
            colors={colors}
            onPress={resetOnboarding}
          />
        </View>
      </View>

      {/* Sign Out */}
      {isLoggedIn && (
        <View style={styles.section}>
          <Pressable
            style={[styles.signOutButton, { borderColor: colors.accent }]}
            onPress={() => setIsLoggedIn(false)}
          >
            <Text style={[styles.signOutText, { color: colors.accent }]}>Sign Out</Text>
          </Pressable>
        </View>
      )}

      <Text style={[styles.version, { color: colors.placeholder }]}>Clipprr v1.0.0</Text>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 28,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
  },
  email: {
    fontSize: 14,
    marginTop: 4,
  },
  signInButton: {
    marginTop: 14,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
  },
  signInText: {
    fontSize: 15,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuGroup: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 24,
    textAlign: 'center',
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  signOutButton: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 24,
  },
  trailingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trailingValue: {
    fontSize: 13,
    fontWeight: '500',
  },
});
