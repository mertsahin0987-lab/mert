import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAlertSettings, AlertSettings } from '@/components/AlertSettingsContext';

type RowProps = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  colors: typeof Colors.light;
  isLast?: boolean;
};

function ToggleRow({ icon, title, subtitle, value, onChange, disabled, colors, isLast }: RowProps) {
  return (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
        disabled && { opacity: 0.5 },
      ]}
    >
      <View style={styles.rowLeft}>
        <View
          style={[
            styles.iconBadge,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Feather name={icon} size={16} color={colors.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function SectionLabel({
  label,
  colors,
}: {
  label: string;
  colors: typeof Colors.light;
}) {
  return (
    <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
      {label}
    </Text>
  );
}

export default function AlertSettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { settings, setSetting, resetToDefaults } = useAlertSettings();

  // If neither push nor email is enabled, no alert types matter — disable them.
  const allChannelsOff = !settings.pushEnabled && !settings.emailEnabled;

  const set = <K extends keyof AlertSettings>(key: K) => (value: AlertSettings[K]) =>
    setSetting(key, value);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <Pressable onPress={() => router.back()} style={styles.iconButton} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Alert Settings</Text>
        <View style={styles.iconButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.textSecondary }]}>
          Choose which alerts land in your Alerts tab and how they reach you.
        </Text>

        {/* Channels */}
        <SectionLabel label="HOW YOU GET ALERTS" colors={colors} />
        <View style={[styles.group, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <ToggleRow
            icon="smartphone"
            title="Push notifications"
            subtitle="Get alerts on your phone"
            value={settings.pushEnabled}
            onChange={set('pushEnabled')}
            colors={colors}
          />
          <ToggleRow
            icon="mail"
            title="Email"
            subtitle="Daily digest of what's new"
            value={settings.emailEnabled}
            onChange={set('emailEnabled')}
            colors={colors}
            isLast
          />
        </View>

        {/* Retailer-wide deals (high value, surfaced separately) */}
        <SectionLabel label="RETAILER DEALS" colors={colors} />
        <View style={[styles.group, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <ToggleRow
            icon="percent"
            title="VAT-free days"
            subtitle="Save 16.67% — rare, time-sensitive events"
            value={settings.vatFreeDays}
            onChange={set('vatFreeDays')}
            disabled={allChannelsOff}
            colors={colors}
          />
          <ToggleRow
            icon="zap"
            title="Flash sales"
            subtitle="24-hour deals, bank holiday sales, weekend events"
            value={settings.flashSales}
            onChange={set('flashSales')}
            disabled={allChannelsOff}
            colors={colors}
            isLast
          />
        </View>

        {/* Alert types */}
        <SectionLabel label="WHAT YOU GET ALERTED ABOUT" colors={colors} />
        <View style={[styles.group, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <ToggleRow
            icon="trending-down"
            title="Price drops"
            subtitle="When a tool you've favourited gets cheaper"
            value={settings.priceDrops}
            onChange={set('priceDrops')}
            disabled={allChannelsOff}
            colors={colors}
          />
          <ToggleRow
            icon="zap"
            title="New releases"
            subtitle="Brand new tools from your favourite brands"
            value={settings.newReleases}
            onChange={set('newReleases')}
            disabled={allChannelsOff}
            colors={colors}
          />
          <ToggleRow
            icon="package"
            title="Back in stock"
            subtitle="When sold-out tools become available again"
            value={settings.backInStock}
            onChange={set('backInStock')}
            disabled={allChannelsOff}
            colors={colors}
          />
          <ToggleRow
            icon="calendar"
            title="Coming soon"
            subtitle="Reminders for upcoming releases"
            value={settings.comingSoon}
            onChange={set('comingSoon')}
            disabled={allChannelsOff}
            colors={colors}
          />
          <ToggleRow
            icon="file-text"
            title="Weekly digest"
            subtitle="A summary of the week's drops & deals"
            value={settings.weeklyDigest}
            onChange={set('weeklyDigest')}
            disabled={allChannelsOff}
            colors={colors}
            isLast
          />
        </View>

        {/* Quiet hours */}
        <SectionLabel label="QUIET HOURS" colors={colors} />
        <View style={[styles.group, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
          <ToggleRow
            icon="moon"
            title="Pause alerts at night"
            subtitle={`No notifications between ${settings.quietHoursStart} and ${settings.quietHoursEnd}`}
            value={settings.quietHoursEnabled}
            onChange={set('quietHoursEnabled')}
            disabled={allChannelsOff}
            colors={colors}
            isLast
          />
        </View>

        {/* Reset */}
        <Pressable
          onPress={resetToDefaults}
          style={({ pressed }) => [styles.reset, pressed && { opacity: 0.6 }]}
        >
          <Text style={[styles.resetText, { color: colors.accent }]}>
            Reset to defaults
          </Text>
        </Pressable>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  scroll: {
    paddingBottom: 20,
  },
  intro: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 18,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingHorizontal: 24,
    marginTop: 14,
    marginBottom: 8,
  },
  group: {
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  reset: {
    alignSelf: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
