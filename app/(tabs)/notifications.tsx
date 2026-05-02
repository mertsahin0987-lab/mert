import React from 'react';
import { StyleSheet, View, Text, ScrollView, Pressable } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { notifications, Notification } from '@/constants/MockData';

// === Helpers ===

const ICON_MAP: Record<Notification['type'], React.ComponentProps<typeof FontAwesome>['name']> = {
  release: 'star',
  update: 'refresh',
  promo: 'tag',
  price_drop: 'arrow-down',
  back_in_stock: 'cube',
  coming_soon: 'calendar',
  vat_free: 'percent',
  flash_sale: 'bolt',
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

function formatCountdown(endsAt: string) {
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const diffMs = end - now;
  if (diffMs <= 0) return 'Ended';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days >= 1) return `Ends in ${days}d ${hours % 24}h`;
  if (hours >= 1) return `Ends in ${hours}h`;
  const mins = Math.floor(diffMs / (1000 * 60));
  return `Ends in ${mins}m`;
}

// === Components ===

function DealBanner({
  item,
  colors,
  colorScheme,
}: {
  item: Notification;
  colors: typeof Colors.light;
  colorScheme: 'light' | 'dark';
}) {
  const isVatFree = item.type === 'vat_free';
  const accentBg = isVatFree
    ? (colorScheme === 'dark' ? '#3A1F2A' : '#FFEEF1')
    : (colorScheme === 'dark' ? '#3A2A1F' : '#FFF4E6');
  const accentBorder = isVatFree ? colors.accent : '#F59E0B';

  return (
    <Pressable
      style={[
        styles.dealCard,
        { backgroundColor: accentBg, borderColor: accentBorder },
      ]}
    >
      <View style={styles.dealTopRow}>
        <View style={[styles.dealBadge, { backgroundColor: accentBorder }]}>
          <FontAwesome name={ICON_MAP[item.type]} size={11} color="#FFFFFF" />
          <Text style={styles.dealBadgeText}>{item.discountLabel || 'DEAL'}</Text>
        </View>
        {item.endsAt && (
          <View style={styles.countdownPill}>
            <FontAwesome name="clock-o" size={11} color={accentBorder} />
            <Text style={[styles.countdownText, { color: accentBorder }]}>
              {formatCountdown(item.endsAt)}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.dealTitle, { color: colors.text }]} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={[styles.dealMessage, { color: colors.textSecondary }]} numberOfLines={2}>
        {item.message}
      </Text>

      {item.retailer && (
        <View style={styles.dealFooter}>
          <FontAwesome name="shopping-bag" size={11} color={colors.textSecondary} />
          <Text style={[styles.dealRetailer, { color: colors.textSecondary }]}>
            {item.retailer}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function StandardNotification({
  item,
  colors,
  colorScheme,
}: {
  item: Notification;
  colors: typeof Colors.light;
  colorScheme: 'light' | 'dark';
}) {
  return (
    <Pressable
      style={[
        styles.notificationCard,
        !item.read && { backgroundColor: colorScheme === 'dark' ? colors.surfaceAlt : '#F8F9FF' },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: colors.surface }]}>
        <FontAwesome name={ICON_MAP[item.type]} size={16} color={colors.accent} />
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.accent }]} />}
        </View>
        <Text style={[styles.notificationMessage, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={[styles.notificationDate, { color: colors.placeholder }]}>
          {formatDate(item.date)}
        </Text>
      </View>
    </Pressable>
  );
}

// === Screen ===

export default function NotificationsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  // Split feed: urgent retailer-wide deals at top, regular alerts below.
  const urgentDeals = notifications.filter(
    n => (n.type === 'vat_free' || n.type === 'flash_sale')
  );
  const standardAlerts = notifications.filter(
    n => n.type !== 'vat_free' && n.type !== 'flash_sale'
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {unreadCount > 0 && (
          <View style={styles.unreadBanner}>
            <Text style={[styles.unreadText, { color: colors.accent }]}>
              {unreadCount} new
            </Text>
          </View>
        )}

        {urgentDeals.length > 0 && (
          <View style={styles.dealsSection}>
            <View style={styles.sectionHeader}>
              <FontAwesome name="fire" size={13} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Live deals
              </Text>
              <View style={[styles.countBadge, { backgroundColor: colors.accent }]}>
                <Text style={styles.countBadgeText}>{urgentDeals.length}</Text>
              </View>
            </View>
            {urgentDeals.map(item => (
              <DealBanner
                key={item.id}
                item={item}
                colors={colors}
                colorScheme={colorScheme}
              />
            ))}
          </View>
        )}

        {standardAlerts.length > 0 && (
          <View style={styles.alertsSection}>
            <View style={[styles.sectionHeader, { paddingHorizontal: 20 }]}>
              <FontAwesome name="bell" size={13} color={colors.textSecondary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Activity
              </Text>
            </View>
            {standardAlerts.map((item, idx) => (
              <View key={item.id}>
                <StandardNotification
                  item={item}
                  colors={colors}
                  colorScheme={colorScheme}
                />
                {idx < standardAlerts.length - 1 && (
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </View>
        )}

        {notifications.length === 0 && (
          <View style={styles.empty}>
            <FontAwesome name="bell-o" size={48} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No notifications yet
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingBottom: 24,
  },
  unreadBanner: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  unreadText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 16,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Live deals (retailer-wide)
  dealsSection: {
    paddingHorizontal: 20,
  },
  dealCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  dealTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dealBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  countdownText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  dealMessage: {
    fontSize: 13,
    lineHeight: 18,
  },
  dealFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  dealRetailer: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Standard alerts feed
  alertsSection: {
    marginTop: 4,
  },
  separator: {
    height: 0.5,
    marginLeft: 72,
  },
  notificationCard: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  notificationDate: {
    fontSize: 12,
    marginTop: 6,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 120,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
