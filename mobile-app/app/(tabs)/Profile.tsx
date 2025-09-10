// app/profile/index.tsx (or wherever your Profile component lives)
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { authService } from '../../services/authService';
import { listVisits, getMe, updateProfile } from '../../src/api';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';

type Visit = { placeId: string; rating?: number|null; visitDate?: string|null };
const isVisited = (v: Visit) => !!(v.visitDate || (typeof v.rating === 'number' && !Number.isNaN(v.rating)));

export default function Profile() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [visitedCount, setVisitedCount] = useState<number>(0);
  const [friendCode, setFriendCode] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    if (!friendCode) return;
    await Clipboard.setStringAsync(friendCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const shareCode = async () => {
    if (!friendCode) return;
    await Share.share({ message: `Add me on Church Rater: ${friendCode}` });
  };

  const fetchVisitedCount = useCallback(async () => {
    const data = await listVisits();
    if (!Array.isArray(data)) return 0;
    return data.filter(isVisited).length;
  }, []);

  useEffect(() => {
    (async () => {
      const loggedIn = await authService.isSignedIn();
      if (!loggedIn) {
        // try once more to force refresh before sending them to sign-in
        loggedIn = await authService.ensureFreshSession();
      }
      if (!loggedIn) {
        router.replace('/auth/signIn'); // now we’re sure
      }
      try {
        const [stored, count, me] = await Promise.all([
          AsyncStorage.getItem('username'),
          fetchVisitedCount(),
          getMe(), // { userId, displayName? }
        ]);
        setUsername(stored);
        setVisitedCount(count);
        setFriendCode(me.userId);
        if (me.displayName) setDisplayName(me.displayName);
      } catch (e: any) {
        Alert.alert('Error', e?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchVisitedCount, router]);

  useFocusEffect(
    useCallback(() => {
      (async () => setVisitedCount(await fetchVisitedCount()))();
      return () => {};
    }, [fetchVisitedCount])
  );

  const onSaveDisplayName = async () => {
    const name = displayName.trim();
    if (!name) {
      Alert.alert('Display Name', 'Please enter a valid display name.');
      return;
    }
    try {
      setSaving(true);
      await updateProfile({ displayName: name });
      Alert.alert('Saved', 'Your display name has been updated.');
      // optional: refetch to be 100% sure UI mirrors backend
      const me = await getMe();
      if (me.displayName) setDisplayName(me.displayName);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  const onSignOut = async () => {
    await authService.signOut();
    await AsyncStorage.removeItem('username');
    router.replace('/auth/signIn');
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Welcome{username ? `, ${username}` : ''}!</Text>

      {/* Display name editor */}
      <View style={styles.card}>
        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter a name friends will see"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
        />
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={onSaveDisplayName}
          disabled={saving}
        >
          {saving ? <ActivityIndicator /> : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: 24, width: '100%', alignItems: 'center' }}>
        <Text style={{ fontWeight: '700', marginBottom: 8 }}>Your Friend Code</Text>

        <View style={styles.codeRow}>
          <Text style={styles.codeText} numberOfLines={1}>{friendCode}</Text>

          <TouchableOpacity onPress={copyCode} style={styles.copyBtn}>
            <Text style={styles.copyText}>{copied ? 'Copied!' : 'Copy'}</Text>
          </TouchableOpacity>

          {/* Optional share button */}
          <TouchableOpacity onPress={shareCode} style={styles.shareBtn}>
            <Text style={styles.shareText}>Share</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Button title="Friends" onPress={() => router.push('/friends')} />
      <View style={{ height: 12 }} />
      <Button title="Sign Out" onPress={onSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex:1, justifyContent:'center', alignItems:'center' },
  container: { flex:1, padding:16, justifyContent:'center', alignItems:'center' },
  greeting: { fontSize:22, marginBottom:12, fontWeight: '600' },

  card: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#333' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
  },
  saveBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  saveText: { color: 'white', fontWeight: '700' },

  stat: { fontSize:16, marginBottom:24, color:'#444' },
  bold: { fontWeight:'700' },

  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#fafafa',
  },
  codeText: {
    flex: 1,
    fontFamily: 'Menlo',
    fontSize: 14,
  },
  copyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#007AFF',
  },
  copyText: { color: 'white', fontWeight: '700' },
  shareBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#34c759',
  },
  shareText: { color: 'white', fontWeight: '700' },
});
