import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from 'react-native'; // Updated import to use react-native's useColorScheme

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen 
          name="(hiddenPage)" 
          options={{ 
            headerShown: false,
            header: () => null,
            presentation: 'fullScreenModal',
            gestureEnabled: false
          }} 
        />
        <Stack.Screen name="index" />
        {/* This screen is used to handle not found routes */}
        <Stack.Screen name="+not-found" />
        {/* make it so that the hiddenPage files cant be seen in the navbar */}
        <Stack.Screen name="YourLists" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
