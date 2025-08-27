// app/friends/[id].tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getFriendVisits, FriendVisit } from '../../src/api';

export default function FriendDetail() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [visits, setVisits] = useState<FriendVisit[]>([]);
  const [loading, setLoading] = useState(true);

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
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to load visits');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        data={visits}
        keyExtractor={(v, i) => `${v.placeId}:${v.timestamp || v.visitDate || i}`}
        renderItem={({ item }) => {
          const title = item.placeName || item.placeId;
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
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ color: '#666' }}>No visits yet.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  sub: { fontSize: 12, color: '#666' },
});
