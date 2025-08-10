// app/(hiddenPage)/_layout.tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { getCurrentUser } from 'aws-amplify/auth';

export default function HiddenLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await getCurrentUser(); // throws if not signed in
      } catch {
        router.replace('../auth/signIn'); // make sure this route exists
        return;
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, presentation: 'fullScreenModal' }}>
      <Stack.Screen name="addEdit" />
      <Stack.Screen name="detailsPage" />
    </Stack>
  );
}
