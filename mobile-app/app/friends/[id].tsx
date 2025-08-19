import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import { getFriendVisits, FriendVisit } from '../../src/api';

export default function FriendDetail() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [visits, setVisits] = useState<FriendVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [nameCache, setNameCache] = useState<Record<string, string>>({});

  const apiKey = (Constants.expoConfig?.extra as any)?.googleMapsApiKey ?? '';

  useEffect(() => {
    (async () => {
      try {
        const data = await getFriendVisits(String(id));
        // newest first by timestamp or visitDate
        const sorted = [...data].sort((a, b) => {
          const ta = Date.parse(a.timestamp || a.visitDate || '') || 0;
          const tb = Date.parse(b.timestamp || b.visitDate || '') || 0;
          return tb - ta;
        });
        setVisits(sorted);

        // prefetch names for first page
        for (const v of sorted.slice(0, 15)) {
          if (v.placeId) void fetchName(v.placeId);
        }
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to load visits');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const fetchName = async (placeId: string) => {
    if (!placeId || nameCache[placeId] || !apiKey) return;
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=name&key=${apiKey}`
      );
      const json = await res.json();
      if (json.status === 'OK' && json.result?.name) {
        setNameCache(prev => ({ ...prev, [placeId]: json.result.name }));
      }
    } catch {}
  };

  if (loading) return (<View style={styles.center}><ActivityIndicator size="large" /></View>);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        data={visits}
        keyExtractor={(v, i) => v.placeId + ':' + i}
        renderItem={({ item }) => {
          const title = nameCache[item.placeId] || item.placeId;
          return (
            <View style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>{title}</Text>
                <Text style={styles.sub}>
                  Rating: {item.rating ?? 'N/A'}{item.visitDate ? ` · ${item.visitDate}` : ''}
                </Text>
              </View>
            </View>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListHeaderComponent={
          <Text style={styles.header}>{name ? `${name}'s Visits` : 'Friend Visits'}</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff',
  },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  sub: { fontSize: 12, color: '#666' },
});
