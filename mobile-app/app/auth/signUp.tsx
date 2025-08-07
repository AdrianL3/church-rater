import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { authService } from '../../services/authService';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const onSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      console.log('Attempting to sign up with email:', email);
      const result = await authService.signUp(email, email, password);
      console.log('Sign up result:', result);
      
      if (result.success) {
        setShowConfirmation(true);
        Alert.alert('Success', 'Account created! Please check your email for the verification code and enter it below.');
      } else {
        Alert.alert('Sign Up Error', result.error || 'Failed to sign up');
      }
    } catch (err: any) {
      console.error('Sign up error details:', err);
      Alert.alert('Sign Up Error', err.message || 'Failed to sign up');
    }
  };

  const onConfirmSignUp = async () => {
    if (!confirmationCode) {
      Alert.alert('Error', 'Please enter the confirmation code');
      return;
    }

    try {
      console.log('Attempting to confirm sign up with code:', confirmationCode);
      const result = await authService.confirmSignUp(email, confirmationCode);
      console.log('Confirmation result:', result);
      
      if (result.success) {
        Alert.alert('Success', 'Email verified! You can now sign in.');
        router.push('/auth/signIn');
      } else {
        Alert.alert('Confirmation Error', result.error || 'Failed to confirm sign up');
      }
    } catch (err: any) {
      console.error('Confirmation error details:', err);
      Alert.alert('Confirmation Error', err.message || 'Failed to confirm sign up');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      
      {!showConfirmation ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <Button title="Sign Up" onPress={onSignUp} />
          <Button title="Already have an account? Sign In" onPress={() => router.push('/auth/signIn')} />
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>Enter the verification code sent to your email</Text>
          <TextInput
            style={styles.input}
            placeholder="Confirmation Code"
            value={confirmationCode}
            onChangeText={setConfirmationCode}
            keyboardType="number-pad"
          />
          <Button title="Confirm Sign Up" onPress={onConfirmSignUp} />
          <Button title="Back to Sign Up" onPress={() => setShowConfirmation(false)} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  subtitle: { fontSize: 16, marginBottom: 20, textAlign: 'center', color: '#666' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 12, borderRadius: 4 },
});
