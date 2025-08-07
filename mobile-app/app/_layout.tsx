// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Slot, useRouter } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';

// Import polyfills for AWS Amplify
import 'react-native-get-random-values';

import { Amplify } from 'aws-amplify';
import awsconfig from '../src/aws-exports';
import { authService } from '../services/authService';

// configure Amplify once…
Amplify.configure(awsconfig);

export default function RootLayout() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    console.log('Starting authentication check with custom service...');
    
    // Add a timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      console.log('Authentication check timed out, proceeding to main app');
      setChecking(false);
    }, 5000); // 5 second timeout
    
    // Check if user is authenticated using custom service
    authService.isAuthenticated()
      .then((isAuthenticated) => {
        console.log('Authentication check result:', isAuthenticated);
        clearTimeout(timeoutId);
        setChecking(false);
        
        if (!isAuthenticated) {
          // no user → send them to /auth/signIn
          console.log('User not authenticated, redirecting to sign in');
          setTimeout(() => {
            router.replace('/auth/signIn');
          }, 100);
        }
      })
      .catch((error) => {
        console.log('Authentication check error:', error);
        clearTimeout(timeoutId);
        setChecking(false);
        // On error, redirect to sign in
        setTimeout(() => {
          router.replace('/auth/signIn');
        }, 100);
      });
  }, []);

  // while we’re waiting for the Auth check, don’t render anything
  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, fontSize: 16 }}>Checking authentication...</Text>
      </View>
    );
  }

  return <Slot />;
}


// import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
// import { useFonts } from 'expo-font';
// import { Stack } from 'expo-router';
// import { StatusBar } from 'expo-status-bar';
// import 'react-native-reanimated';

// import { useColorScheme } from 'react-native'; // Updated import to use react-native's useColorScheme

// export default function RootLayout() {
//   const colorScheme = useColorScheme();
//   const [loaded] = useFonts({
//     SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
//   });

//   if (!loaded) {
//     // Async font loading only occurs in development.
//     return null;
//   }

//   return (
//     <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
//       <Stack screenOptions={{ headerShown: false }}>
//         <Stack.Screen name="(tabs)" />
//         <Stack.Screen 
//           name="(hiddenPage)" 
//           options={{ 
//             headerShown: false,
//             header: () => null,
//             presentation: 'fullScreenModal',
//             gestureEnabled: false
//           }} 
//         />
//         <Stack.Screen name="index" />
//         {/* This screen is used to handle not found routes */}
//         <Stack.Screen name="+not-found" />
//         {/* make it so that the hiddenPage files cant be seen in the navbar */}
//         <Stack.Screen name="YourLists" />
//       </Stack>
//       <StatusBar style="auto" />
//     </ThemeProvider>
//   );
// }
