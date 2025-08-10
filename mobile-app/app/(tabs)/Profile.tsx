// app/(tabs)/Profile.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { authService } from '../../services/authService';

export default function Profile() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // 1) Check auth
      const loggedIn = await authService.isSignedIn();
      if (!loggedIn) {
        router.replace('/auth/signIn');
        return;
      }
      // 2) Load the stored username
      const stored = await AsyncStorage.getItem('username');
      setUsername(stored);
      setLoading(false);
    })();
  }, []);

  const onSignOut = async () => {
    await authService.signOut();
    // clear stored username, too
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
      <Button title="Sign Out" onPress={onSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  center:    { flex:1, justifyContent:'center', alignItems:'center' },
  container: { flex:1, padding:16, justifyContent:'center', alignItems:'center' },
  greeting:  { fontSize:22, marginBottom:24 },
});
