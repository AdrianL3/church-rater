import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { listVisits } from '../../src/api';
import { getPlaceName, prefetchNames } from '../../src/lib/placeNames';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

type Visit = {
  userId: string;
  placeId: string;
  rating?: number | null;
  notes?: string | null;
  visitDate?: string | null;   // "YYYY-MM-DD"
  imageKeys?: string[];
  timestamp?: string;
};

type SortMode = 'recent' | 'visited' | 'rating';

export default function YourLists() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<SortMode>('recent');

  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const bottomPad = tabBarHeight + insets.bottom + 24;

  // placeId -> name cache for UI
  const [nameCache, setNameCache] = useState<Record<string, string>>({});
  const isVisited = (v: Visit) =>
    !!(v.visitDate || (typeof v.rating === 'number' && !Number.isNaN(v.rating)));

  const load = useCallback(async () => {
    try {
      const data = await listVisits();
      setVisits(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.warn('listVisits failed:', e?.message || e);
      Alert.alert('Error', e?.message || 'Failed to load your list');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Prefetch names for the first few items and resolve cached ones into state
  useEffect(() => {
    const firstIds = visits.slice(0, 10).map(v => v.placeId);
    prefetchNames(firstIds);
    (async () => {
      const entries = await Promise.all(
        firstIds.map(async id => [id, await getPlaceName(id)] as const)
      );
      setNameCache(prev => {
        const next = { ...prev };
        for (const [id, name] of entries) if (name && !next[id]) next[id] = name;
        return next;
      });
    })();
  }, [visits]);

  // Also fetch names as rows become visible
  const onViewableItemsChanged = useRef(
    async ({ viewableItems }: { viewableItems: Array<{ item: Visit }> }) => {
      const entries = await Promise.all(
        viewableItems.map(async ({ item }) => [item.placeId, await getPlaceName(item.placeId)] as const)
      );
      setNameCache(prev => {
        const next = { ...prev };
        for (const [id, name] of entries) if (name && !next[id]) next[id] = name;
        return next;
      });
    }
  ).current;
  const viewConfigRef = useRef({ viewAreaCoveragePercentThreshold: 20 });

  const onRefresh = () => {
    setRefreshing(true);
    setNameCache({});
    load();
  };

  const sorted = useMemo(() => {
    const arr = [...visits];
    switch (sort) {
      case 'rating':
        // high → low (missing ratings sink to bottom)
        return arr.sort(
          (a, b) =>
            (b.rating ?? Number.NEGATIVE_INFINITY) - (a.rating ?? Number.NEGATIVE_INFINITY)
        );
      case 'recent':
      default:
        // newest timestamp first
        return arr.sort(
          (a, b) =>
            new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime()
        );
    }
  }, [visits, sort]);

  const Item = ({ v }: { v: Visit }) => {
    const visited = isVisited(v);
    const title = nameCache[v.placeId] /* || v.title */ || v.placeId;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: '/(hiddenPage)/detailsPage',
            params: { placeId: v.placeId, title }, // pass title for nicer header
          })
        }
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>

          <View style={styles.row}>
            <Text style={styles.badge}>{visited ? '✅ Visited' : '—'}</Text>
            <Text style={styles.dot}>•</Text>
            <Text style={styles.sub}>
              Rating: {typeof v.rating === 'number' ? v.rating : 'N/A'}
            </Text>
            {v.visitDate ? (
              <>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.sub}>Date: {v.visitDate}</Text>
              </>
            ) : null}
          </View>

          {v.notes ? (
            <Text style={styles.notes} numberOfLines={1}>
              {v.notes}
            </Text>
          ) : null}
        </View>
        <Text style={styles.chev}>›</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>Loading your visits…</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.sortBar, { paddingTop: insets.top + 8 }]}>
        <SortButton label="Recent"  active={sort === 'recent'}  onPress={() => setSort('recent')} />
        <SortButton label="Rating ↓" active={sort === 'rating'} onPress={() => setSort('rating')} />
      </View>

      <FlatList
        style={{ flex: 1 }}
        data={sorted}
        keyExtractor={(v) => `${v.userId}:${v.placeId}`}
        renderItem={({ item }) => <Item v={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        // 👇 give the list extra bottom space
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: '#666' }}>No visits yet. Go rate a church!</Text>
          </View>
        }
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfigRef.current}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

function SortButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.sortBtn, active ? styles.sortBtnActive : undefined]}
    >
      <Text style={[styles.sortText, active ? styles.sortTextActive : undefined]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  sortBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 85,
    paddingBottom: 4,
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  sortBtnActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  sortText: { fontWeight: '600', color: '#333' },
  sortTextActive: { color: 'white' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  badge: { fontSize: 12, color: '#0a7', fontWeight: '700' },
  sub: { fontSize: 12, color: '#666' },
  dot: { marginHorizontal: 4, color: '#bbb' },
  notes: { marginTop: 4, color: '#444' },
  chev: { fontSize: 22, color: '#bbb', paddingHorizontal: 4 },
});
