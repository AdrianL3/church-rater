// app/.../Profile.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { authService } from '../../services/authService';
import { listVisits } from '../../src/api';

type Visit = {
  placeId: string;
  rating?: number | null;
  visitDate?: string | null;
  notes?: string | null;
};

const isVisited = (v: Visit) =>
  !!(v.visitDate || (typeof v.rating === 'number' && !Number.isNaN(v.rating)));

export default function Profile() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [visitedCount, setVisitedCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchVisitedCount = useCallback(async (): Promise<number> => {
    const data = await listVisits();
    if (!Array.isArray(data)) return 0;
    return data.filter((v: Visit) => isVisited(v)).length;
  }, []);

  useEffect(() => {
    (async () => {
      const loggedIn = await authService.isSignedIn();
      if (!loggedIn) {
        router.replace('/auth/signIn');
        return;
      }
      const [stored, count] = await Promise.all([
        AsyncStorage.getItem('username'),
        fetchVisitedCount(),
      ]);
      setUsername(stored);
      setVisitedCount(count);
      setLoading(false);
    })();
  }, [fetchVisitedCount, router]);

  // Refresh count whenever user returns to Profile
  useFocusEffect(
    useCallback(() => {
      (async () => {
        if (await authService.isSignedIn()) {
          const count = await fetchVisitedCount();
          setVisitedCount(count);
        }
      })();
      return () => {};
    }, [fetchVisitedCount])
  );

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
      <Text style={styles.greeting}>
        Welcome{username ? `, ${username}` : ''}!
      </Text>

      <Text style={styles.stat}>
        You’ve visited <Text style={styles.bold}>{visitedCount}</Text> church{visitedCount === 1 ? '' : 'es'}.
      </Text>

      <Button title="Sign Out" onPress={onSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  center:    { flex:1, justifyContent:'center', alignItems:'center' },
  container: { flex:1, padding:16, justifyContent:'center', alignItems:'center' },
  greeting:  { fontSize:22, marginBottom:12, fontWeight: '600' },
  stat:      { fontSize:16, marginBottom:24, color:'#444' },
  bold:      { fontWeight:'700' },
});
