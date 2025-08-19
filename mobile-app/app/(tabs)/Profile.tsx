import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { authService } from '../../services/authService';
import { listVisits, getMe } from '../../src/api';

type Visit = { placeId: string; rating?: number|null; visitDate?: string|null };
const isVisited = (v: Visit) => !!(v.visitDate || (typeof v.rating === 'number' && !Number.isNaN(v.rating)));

export default function Profile() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [visitedCount, setVisitedCount] = useState<number>(0);
  const [friendCode, setFriendCode] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchVisitedCount = useCallback(async () => {
    const data = await listVisits();
    if (!Array.isArray(data)) return 0;
    return data.filter(isVisited).length;
  }, []);

  useEffect(() => {
    (async () => {
      const loggedIn = await authService.isSignedIn();
      if (!loggedIn) {
        router.replace('/auth/signIn');
        return;
      }
      try {
        const [stored, count, me] = await Promise.all([
          AsyncStorage.getItem('username'),
          fetchVisitedCount(),
          getMe(),
        ]);
        setUsername(stored);
        setVisitedCount(count);
        setFriendCode(me.userId); // your friend code
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

  const onSignOut = async () => {
    await authService.signOut();
    await AsyncStorage.removeItem('username');
    router.replace('/auth/signIn');
  };

  if (loading) return (<View style={styles.center}><ActivityIndicator size="large" /></View>);

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Welcome{username ? `, ${username}` : ''}!</Text>

      <Text style={styles.stat}>You’ve visited <Text style={styles.bold}>{visitedCount}</Text> church{visitedCount === 1 ? '' : 'es'}.</Text>

      <View style={{ marginBottom: 24, alignItems: 'center' }}>
        <Text style={{ fontWeight: '700' }}>Your Friend Code</Text>
        <Text style={{ fontFamily: 'Menlo', marginTop: 4 }}>{friendCode}</Text>
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
  stat: { fontSize:16, marginBottom:24, color:'#444' },
  bold: { fontWeight:'700' },
});
