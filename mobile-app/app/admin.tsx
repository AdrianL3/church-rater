import React, { useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { fetchAuthSession, signIn } from 'aws-amplify/auth';
import awsconfig from '../src/aws-exports';
import { authService } from '../services/authService';

export default function AdminScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const checkAuth = async () => {
    try {
      console.log('=== CHECKING AUTH SESSION ===');
      const session = await fetchAuthSession();
      console.log('Current auth session:', session);
      console.log('Session tokens:', session.tokens);
      console.log('User sub:', session.tokens?.accessToken?.payload?.sub);
      
      Alert.alert('Auth Info', `Authenticated: ${session.tokens ? 'Yes' : 'No'}\n\n${JSON.stringify(session, null, 2)}`);
    } catch (error: any) {
      console.error('Auth check error:', error);
      if (error.name === 'NotAuthorizedException') {
        Alert.alert('Auth Info', 'Not authenticated (this is normal when not signed in)');
      } else {
        Alert.alert('Auth Error', `Error: ${error.message}\n\nThis is normal if not signed in.`);
      }
    }
  };

  const goToSignIn = () => {
    router.push('/auth/signIn');
  };

  const goToSignUp = () => {
    router.push('/auth/signUp');
  };

  const goToMainApp = () => {
    router.push('/');
  };

  const testSignIn = async () => {
    try {
      console.log('=== TESTING SIGN IN ===');
      console.log('Using test credentials...');
      
      // Test with a simple sign-in attempt
      const result = await signIn({ 
        username: 'test@example.com', 
        password: 'testpassword123' 
      });
      
      console.log('Test sign in result:', result);
      Alert.alert('Test Result', 'Sign in function works (but credentials are wrong)');
    } catch (error: any) {
      console.error('Test sign in error:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('Error constructor:', error.constructor.name);
      
      if (error.name === 'UserNotFoundException') {
        Alert.alert('Test Result', '✅ AWS Amplify is working correctly - user not found (expected)');
      } else if (error.name === 'NotAuthorizedException') {
        Alert.alert('Test Result', '✅ AWS Amplify is working correctly - invalid credentials (expected)');
      } else if (error.name === 'Unknown') {
        Alert.alert('Test Result', '❌ AWS Amplify configuration issue - unknown error');
      } else {
        Alert.alert('Test Result', `Error: ${error.name} - ${error.message}`);
      }
    }
  };

  const testDirectSignIn = async () => {
    try {
      console.log('=== TESTING DIRECT SIGN IN ===');
      
      const clientId = awsconfig.aws_user_pools_web_client_id;
      const region = awsconfig.aws_project_region;
      const url = `https://cognito-idp.${region}.amazonaws.com/`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: clientId,
          AuthParameters: {
            USERNAME: 'test@example.com',
            PASSWORD: 'testpassword123',
          },
        }),
      });
      
      const data = await response.json();
      console.log('Direct sign in response:', data);
      
      if (data.__type === 'UserNotFoundException') {
        Alert.alert('Direct Sign In Test', '✅ Direct sign in works - user not found (expected)');
      } else if (data.__type === 'NotAuthorizedException') {
        Alert.alert('Direct Sign In Test', '✅ Direct sign in works - invalid credentials (expected)');
      } else if (data.AuthenticationResult) {
        Alert.alert('Direct Sign In Test', '✅ Direct sign in works - authentication successful!');
      } else {
        Alert.alert('Direct Sign In Test', `Response: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (error: any) {
      console.error('Direct sign in error:', error);
      Alert.alert('Direct Sign In Test', `Error: ${error.message}`);
    }
  };

  const testCustomAuthService = async () => {
    try {
      console.log('=== TESTING CUSTOM AUTH SERVICE ===');
      
      const result = await authService.signIn('test@example.com', 'testpassword123');
      console.log('Custom auth service result:', result);
      
      if (result.success) {
        Alert.alert('Custom Auth Service Test', '✅ Custom auth service works - authentication successful!');
      } else {
        Alert.alert('Custom Auth Service Test', `✅ Custom auth service works - ${result.error} (expected)`);
      }
    } catch (error: any) {
      console.error('Custom auth service error:', error);
      Alert.alert('Custom Auth Service Test', `Error: ${error.message}`);
    }
  };

  const testDirectAPI = async () => {
    try {
      console.log('=== TESTING DIRECT API CALL ===');
      
      // Test direct API call to Cognito
      const userPoolId = awsconfig.aws_user_pools_id;
      const clientId = awsconfig.aws_user_pools_web_client_id;
      const region = awsconfig.aws_project_region;
      
      const url = `https://cognito-idp.${region}.amazonaws.com/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify({
          AuthFlow: 'USER_PASSWORD_AUTH', // Use USER_PASSWORD_AUTH since it's enabled
          ClientId: clientId,
          AuthParameters: {
            USERNAME: 'test@example.com',
            PASSWORD: 'testpassword123',
          },
        }),
      });
      
      const data = await response.json();
      console.log('Direct API response:', data);
      
      if (data.__type === 'UserNotFoundException') {
        Alert.alert('Direct API Test', '✅ Direct API call works - user not found (expected)');
      } else if (data.__type === 'InvalidParameterException') {
        Alert.alert('Direct API Test', `❌ Auth flow issue: ${data.message}\n\nThis explains the "unknown error"!`);
      } else {
        Alert.alert('Direct API Test', `Response: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (error: any) {
      console.error('Direct API test error:', error);
      Alert.alert('Direct API Test', `Error: ${error.message}`);
    }
  };

  const checkAuthFlows = async () => {
    try {
      console.log('=== CHECKING AUTH FLOWS ===');
      
      // Test different auth flows to see which ones are enabled
      const clientId = awsconfig.aws_user_pools_web_client_id;
      const region = awsconfig.aws_project_region;
      const url = `https://cognito-idp.${region}.amazonaws.com/`;
      
      const authFlows = [
        'USER_PASSWORD_AUTH',
        'USER_SRP_AUTH', 
        'ADMIN_USER_PASSWORD_AUTH',
        'ADMIN_NO_SRP_AUTH'
      ];
      
      const results = [];
      
      for (const flow of authFlows) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-amz-json-1.1',
              'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
            },
            body: JSON.stringify({
              AuthFlow: flow,
              ClientId: clientId,
              AuthParameters: {
                USERNAME: 'test@example.com',
                PASSWORD: 'test',
              },
            }),
          });
          
          const data = await response.json();
          if (data.__type === 'InvalidParameterException') {
            results.push(`❌ ${flow}: ${data.message}`);
          } else {
            results.push(`✅ ${flow}: Available`);
          }
        } catch (error) {
          results.push(`❌ ${flow}: Error`);
        }
      }
      
      const message = results.join('\n');
      Alert.alert('Auth Flows Check', message);
      
    } catch (error: any) {
      console.error('Auth flows check error:', error);
      Alert.alert('Auth Flows Check', `Error: ${error.message}`);
    }
  };

  const testAmplifyConfig = async () => {
    try {
      console.log('=== TESTING AMPLIFY CONFIG ===');
      console.log('AWS Config:', awsconfig);
      
      // Test if we can access the config
      const userPoolId = awsconfig.aws_user_pools_id;
      const clientId = awsconfig.aws_user_pools_web_client_id;
      const region = awsconfig.aws_project_region;
      
      console.log('User Pool ID:', userPoolId);
      console.log('Client ID:', clientId);
      console.log('Region:', region);
      
      Alert.alert('Config Test', `Config loaded successfully!\n\nRegion: ${region}\nUser Pool: ${userPoolId}\nClient ID: ${clientId}`);
    } catch (error: any) {
      console.error('Config test error:', error);
      Alert.alert('Config Error', `Failed to load config: ${error.message}`);
    }
  };

  const testNetwork = async () => {
    try {
      console.log('=== TESTING NETWORK ===');
      
      // Test basic network connectivity
      const response = await fetch('https://httpbin.org/get');
      const data = await response.json();
      
      console.log('Network test successful:', data);
      Alert.alert('Network Test', 'Network connectivity is working!');
    } catch (error: any) {
      console.error('Network test error:', error);
      Alert.alert('Network Error', `Network test failed: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Panel</Text>
      <Text style={styles.subtitle}>Development Tools</Text>

      <View style={styles.buttonContainer}>
        <Button title="Check Auth Session" onPress={checkAuth} />
        <View style={styles.spacer} />
        
        <Button title="Test Sign In Function" onPress={testSignIn} />
        <View style={styles.spacer} />
        
        <Button title="Test Direct Sign In" onPress={testDirectSignIn} />
        <View style={styles.spacer} />
        
        <Button title="Test Custom Auth Service" onPress={testCustomAuthService} />
        <View style={styles.spacer} />
        
        <Button title="Test Direct API Call" onPress={testDirectAPI} />
        <View style={styles.spacer} />
        
        <Button title="Check Auth Flows" onPress={checkAuthFlows} />
        <View style={styles.spacer} />
        
        <Button title="Test Amplify Config" onPress={testAmplifyConfig} />
        <View style={styles.spacer} />
        
        <Button title="Test Network" onPress={testNetwork} />
        <View style={styles.spacer} />
        
        <Button title="Go to Sign In" onPress={goToSignIn} />
        <View style={styles.spacer} />
        
        <Button title="Go to Sign Up" onPress={goToSignUp} />
        <View style={styles.spacer} />
        
        <Button title="Go to Main App" onPress={goToMainApp} />
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          To delete all users, use the AWS Console:
        </Text>
        <Text style={styles.infoText}>
          1. Go to AWS Cognito Console
        </Text>
        <Text style={styles.infoText}>
          2. Find User Pool: us-west-1_NNGeSDxTP
        </Text>
        <Text style={styles.infoText}>
          3. Go to "Users and groups"
        </Text>
        <Text style={styles.infoText}>
          4. Select all users and delete
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  buttonContainer: {
    marginBottom: 40,
  },
  spacer: {
    height: 16,
  },
  infoContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#333',
  },
}); 