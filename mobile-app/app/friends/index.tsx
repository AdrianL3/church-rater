import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, router } from 'expo-router';           // ← add Stack + router
import Constants from 'expo-constants';
import { addFriend, friendsSummary, FriendSummary } from '../../src/api';

type NameCache = Record<string, string>;

export default function FriendsPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FriendSummary[]>([]);
  const [nameCache, setNameCache] = useState<NameCache>({});

  const apiKey = (Constants.expoConfig?.extra as any)?.googleMapsApiKey ?? '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await friendsSummary();
      setItems(data);
      for (const it of data) {
        const pid = it.lastVisit?.placeId;
        if (pid) fetchName(pid);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); return () => {}; }, [load]));
  useEffect(() => { load(); }, [load]);

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

  const onAdd = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    try {
      await addFriend(trimmed);
      setCode('');
      await load();
      Alert.alert('Added', 'Friend added successfully.');
    } catch (e: any) {
      Alert.alert('Add friend failed', e?.message || 'Could not add friend');
    }
  };

  const renderItem = ({ item }: { item: FriendSummary }) => {
    const title = item.displayName || `${item.friendId.slice(0, 8)}…`;
    const lastName = item.lastVisit?.placeId ? (nameCache[item.lastVisit.placeId] || item.lastVisit.placeId) : '—';
    const lastDate = item.lastVisit?.visitDate || '—';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/friends/[id]', params: { id: item.friendId, name: title } })}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.sub}>
            {item.visitedCount} visited · Last: {lastName}{lastDate !== '—' ? ` (${lastDate})` : ''}
          </Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header with Back */}
      <Stack.Screen
        options={{
          title: 'Friends',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={styles.headerBack}>{'\u2039'} Back</Text>
            </TouchableOpacity>
          ),
        }}
      />

      {/* Add by code */}
      <View style={styles.addBar}>
        <TextInput
          style={styles.input}
          placeholder="Enter friend code (userId)"
          autoCapitalize="none"
          value={code}
          onChangeText={setCode}
        />
        <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
          <Text style={{ color: 'white', fontWeight: '700' }}>Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(x) => x.friendId}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          ListEmptyComponent={<View style={styles.center}><Text>No friends yet. Add one above!</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerBack: { fontSize: 16, color: '#007AFF', fontWeight: '600' },

  addBar: { flexDirection: 'row', gap: 8, padding: 16 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 12, height: 44 },
  addBtn: { backgroundColor: '#007AFF', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  sub: { fontSize: 12, color: '#666' },
  chev: { fontSize: 22, color: '#bbb', paddingHorizontal: 4 },
});
