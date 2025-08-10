// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Slot, useRouter } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';

// Import polyfills for AWS Amplify
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import '../src/auth/amplify'; // Ensure Amplify is configured

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
    authService.isSignedIn()
      .then((isSignedIn) => {
        console.log('Authentication check result:', isSignedIn);
        clearTimeout(timeoutId);
        setChecking(false);
        
        if (!isSignedIn) {
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
