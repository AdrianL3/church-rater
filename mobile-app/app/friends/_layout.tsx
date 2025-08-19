import { Stack } from 'expo-router';
export default function FriendsLayout() {
  return (
    <Stack screenOptions={{ headerTitle: 'Friends' }}>
      <Stack.Screen name="index" options={{ title: 'Friends' }} />
      <Stack.Screen name="[id]" options={{ title: 'Friend' }} />
    </Stack>
  );
}
