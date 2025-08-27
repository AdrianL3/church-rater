import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import {
  requestFriend,
  listIncomingRequests,
  listOutgoingRequests,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  friendsSummary,
  FriendSummary,
} from '../../src/api';

type IncomingReq = { requesterUserId: string; createdAt: string };
type OutgoingReq = { targetUserId: string; createdAt: string };

export default function FriendsPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [friends, setFriends] = useState<FriendSummary[]>([]);
  const [incoming, setIncoming] = useState<IncomingReq[]>([]);
  const [outgoing, setOutgoing] = useState<OutgoingReq[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [fs, inc, out] = await Promise.all([
        friendsSummary(),
        listIncomingRequests(),
        listOutgoingRequests(),
      ]);
      setFriends(fs);
      setIncoming(inc);
      setOutgoing(out);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load friends & requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      return () => {};
    }, [load])
  );

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const onSendRequest = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    try {
      await requestFriend(trimmed);
      setCode('');
      await load();
      Alert.alert('Request sent', 'Your friend request was sent.');
    } catch (e: any) {
      Alert.alert('Failed', e?.message || 'Could not send request');
    }
  };

  const onAccept = async (requesterUserId: string) => {
    try {
      await acceptFriendRequest(requesterUserId);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to accept request');
    }
  };

  const onDecline = async (requesterUserId: string) => {
    try {
      await declineFriendRequest(requesterUserId);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to decline request');
    }
  };

  const onRemoveFriend = async (friendId: string) => {
    Alert.alert('Remove friend', 'Are you sure you want to remove this friend?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeFriend(friendId);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to remove friend');
          }
        },
      },
    ]);
  };

  const renderFriend = (item: FriendSummary) => {
    const title = item.displayName || `${item.friendId.slice(0, 8)}…`;
    const lastName = item.lastVisit?.placeName || '—';
    const lastDate = item.lastVisit?.visitDate || '—';

    return (
      <View style={styles.cardRow}>
        <TouchableOpacity
          style={[styles.card, { flex: 1 }]}
          onPress={() =>
            router.push({ pathname: '/friends/[id]', params: { id: item.friendId, name: title } })
          }
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <Text style={styles.sub}>
              {item.visitedCount} visited · Last: {lastName}
              {lastDate !== '—' ? ` (${lastDate})` : ''}
            </Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.removeBtn} onPress={() => onRemoveFriend(item.friendId)}>
          <Text style={styles.removeBtnText}>Remove</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderIncoming = (r: IncomingReq) => {
    const short = `${r.requesterUserId.slice(0, 8)}…`;
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{short}</Text>
          <Text style={styles.sub}>Incoming request</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.acceptBtn} onPress={() => onAccept(r.requesterUserId)}>
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineBtn} onPress={() => onDecline(r.requesterUserId)}>
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderOutgoing = (r: OutgoingReq) => {
    const short = `${r.targetUserId.slice(0, 8)}…`;
    return (
      <View style={styles.card}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>{short}</Text>
          <Text style={styles.sub}>Sent · Pending</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
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

      {/* Add by friend code */}
      <View style={styles.addBar}>
        <TextInput
          style={styles.input}
          placeholder="Enter friend code (userId)"
          autoCapitalize="none"
          value={code}
          onChangeText={setCode}
        />
        <TouchableOpacity style={styles.addBtn} onPress={onSendRequest}>
          <Text style={{ color: 'white', fontWeight: '700' }}>Send</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" /></View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 18 }}
        >
          {/* Friends */}
          <View>
            <Text style={styles.section}>Friends</Text>
            {friends.length === 0 ? (
              <Text style={styles.empty}>No friends yet.</Text>
            ) : (
              <FlatList
                data={friends}
                keyExtractor={(x) => x.friendId}
                renderItem={({ item }) => renderFriend(item)}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                scrollEnabled={false}
              />
            )}
          </View>

          {/* Incoming requests */}
          <View>
            <Text style={styles.section}>Incoming Requests</Text>
            {incoming.length === 0 ? (
              <Text style={styles.empty}>None</Text>
            ) : (
              <FlatList
                data={incoming}
                keyExtractor={(x) => x.requesterUserId}
                renderItem={({ item }) => renderIncoming(item)}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                scrollEnabled={false}
              />
            )}
          </View>

          {/* Sent requests */}
          <View>
            <Text style={styles.section}>Sent Requests</Text>
            {outgoing.length === 0 ? (
              <Text style={styles.empty}>None</Text>
            ) : (
              <FlatList
                data={outgoing}
                keyExtractor={(x) => x.targetUserId}
                renderItem={({ item }) => renderOutgoing(item)}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                scrollEnabled={false}
              />
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerBack: { fontSize: 16, color: '#007AFF', fontWeight: '600' },

  addBar: { flexDirection: 'row', gap: 8, padding: 16 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  addBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  section: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  empty: { color: '#666' },

  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  title: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  sub: { fontSize: 12, color: '#666' },
  chev: { fontSize: 22, color: '#bbb', paddingHorizontal: 4 },

  removeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ff3b30',
  },
  removeBtnText: { color: 'white', fontWeight: '700' },

  acceptBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#34c759',
  },
  acceptText: { color: 'white', fontWeight: '700' },
  declineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ff3b30',
  },
  declineText: { color: 'white', fontWeight: '700' },
});
