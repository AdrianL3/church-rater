// app/auth/reset.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Keyboard,
  TouchableWithoutFeedback,
  useColorScheme,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { authService } from '../../services/authService';
import { DarkTheme } from '@react-navigation/native';

export default function ResetPassword() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Please enter your email.');
      return;
    }
    try {
      setLoading(true);
      const res = await authService.requestPasswordReset(email.trim());
      if ('success' in res && res.success) {
        setCodeSent(true);
        Alert.alert('Code sent', 'Check your email for the verification code.');
      } else {
        Alert.alert('Error', ('error' in res && res.error) || 'Failed to send code');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const doReset = async () => {
    if (!email.trim() || !code.trim() || !newPassword) {
      Alert.alert('Missing fields', 'Please fill in email, code, and new password.');
      return;
    }
    try {
      setLoading(true);
      const res = await authService.confirmPasswordReset(email.trim(), code.trim(), newPassword);
      if ('success' in res && res.success) {
        Alert.alert('Success', 'Your password has been reset.', [
          { text: 'OK', onPress: () => router.replace('/auth/signIn') },
        ]);
      } else {
        Alert.alert('Error', ('error' in res && res.error) || 'Reset failed');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const placeholderColor = isDark ? '#9aa0a6' : '#6b7280';
  const inputBg = isDark ? '#111827' : '#fafafa';
  const inputBorder = isDark ? '#374151' : '#ddd';
  const textColor = isDark ? '#e5e7eb' : '#111827';

  return (
    <>
      <Stack.Screen options={{ title: 'Reset Password' }} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
          <Text style={[styles.title, { color: textColor }]}>Forgot your password?</Text>

          {/* Email (always shown) */}
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
            placeholder="Email"
            placeholderTextColor={placeholderColor}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
            returnKeyType="done"
          />

          {!codeSent ? (
            <TouchableOpacity style={[styles.button, styles.primary]} onPress={sendCode} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Sending…' : 'Send code'}</Text>
            </TouchableOpacity>
          ) : (
            <>
              {/* Code */}
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                placeholder="Verification code"
                placeholderTextColor={placeholderColor}
                autoCapitalize="none"
                value={code}
                onChangeText={setCode}
                editable={!loading}
                returnKeyType="next"
              />
              {/* New password */}
              <TextInput
                style={[styles.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textColor }]}
                placeholder="New password"
                placeholderTextColor={placeholderColor}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                editable={!loading}
                returnKeyType="done"
              />

              <TouchableOpacity style={[styles.button, styles.primary]} onPress={doReset} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Resetting…' : 'Reset password'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.ghost]}
                onPress={() => setCodeSent(false)}
                disabled={loading}
              >
                <Text style={[styles.ghostText, { color: '#007AFF' }]}>Back to send code</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={[styles.button, styles.ghost]} onPress={() => router.replace('/auth/signIn')}>
            <Text style={[styles.ghostText, { color: '#007AFF' }]}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      justifyContent: 'center',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    input: {
      borderWidth: 1,
      padding: 12,
      marginBottom: 16,
      borderRadius: 8,
    },
    button: {
      marginTop: 12,
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    primary: {
      backgroundColor: '#007AFF',
    },
    buttonText: {
      color: '#fff',
      fontWeight: '700',
    },
    ghost: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    ghostText: {
      fontWeight: '600',
    },
  });
  

