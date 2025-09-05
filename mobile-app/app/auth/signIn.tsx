import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../services/authService';

export default function SignIn() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const scheme = useColorScheme();

  const onSignIn = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      console.log('=== SIGN IN ATTEMPT ===');
      console.log('Username:', username);
      console.log('Password length:', password.length);
      
      const result = await authService.signIn(username, password);
      console.log('Sign in result:', result);
      
      if (result.success) {
        console.log('Sign in successful!');
        router.replace('/');  // go to your main app
      } else {
        console.log('Sign in failed:', result.error);
        Alert.alert('Sign In Error', result.error || 'Sign in failed');
      }
    } catch (err: any) {
      console.error('=== SIGN IN ERROR ===');
      console.error('Error:', err);
      Alert.alert('Sign In Error', err?.message ?? String(err));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      <TextInput
        style={styles.input}
        placeholder="Email (use your email as username)"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor={scheme === 'dark' ? '#aaa' : '#666'}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholderTextColor={scheme === 'dark' ? '#aaa' : '#666'}
      />
      <Button title="Sign In" onPress={onSignIn} />
      <Button title="Create Account" onPress={() => router.push('/auth/signUp')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12, borderRadius: 4, color: '#000'},
});
