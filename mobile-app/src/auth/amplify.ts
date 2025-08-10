// src/auth/amplify.ts
import { Amplify } from 'aws-amplify';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';


const extra = Constants.expoConfig?.extra ?? {};

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: extra.cognitoUserPoolId,        // e.g. "us-west-1_NNGeSDxTP"
      userPoolClientId: extra.cognitoAppClientId, // e.g. "32bvrqma8qafn20tj6ki325grc"
    },
  },

  storage: AsyncStorage,
});
