import awsconfig from '../src/aws-exports';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthResult {
  success: boolean;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    idToken: string;
  };
  error?: string;
}

class AuthService {
  private clientId: string;
  private region: string;
  private baseUrl: string;

  constructor() {
    this.clientId = awsconfig.aws_user_pools_web_client_id;
    this.region = awsconfig.aws_project_region;
    this.baseUrl = `https://cognito-idp.${this.region}.amazonaws.com/`;
  }

  async signIn(username: string, password: string): Promise<AuthResult> {
    try {
      console.log('Custom Auth Service: Signing in...');
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: this.clientId,
          AuthParameters: {
            USERNAME: username,
            PASSWORD: password,
          },
        }),
      });

      const data = await response.json();
      console.log('Custom Auth Service: Response:', data);

      if (data.AuthenticationResult) {
        // Store tokens
        await AsyncStorage.setItem('accessToken', data.AuthenticationResult.AccessToken);
        await AsyncStorage.setItem('refreshToken', data.AuthenticationResult.RefreshToken);
        await AsyncStorage.setItem('idToken', data.AuthenticationResult.IdToken);
        
        return {
          success: true,
          tokens: {
            accessToken: data.AuthenticationResult.AccessToken,
            refreshToken: data.AuthenticationResult.RefreshToken,
            idToken: data.AuthenticationResult.IdToken,
          },
        };
      } else if (data.__type === 'UserNotFoundException') {
        return {
          success: false,
          error: 'User not found',
        };
      } else if (data.__type === 'NotAuthorizedException') {
        return {
          success: false,
          error: 'Invalid username or password',
        };
      } else {
        return {
          success: false,
          error: data.message || 'Authentication failed',
        };
      }
    } catch (error: any) {
      console.error('Custom Auth Service: Error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  async signUp(username: string, email: string, password: string): Promise<AuthResult> {
    try {
      console.log('Custom Auth Service: Signing up...');
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp',
        },
        body: JSON.stringify({
          ClientId: this.clientId,
          Username: username,
          Password: password,
          UserAttributes: [
            {
              Name: 'email',
              Value: email,
            },
          ],
        }),
      });

      const data = await response.json();
      console.log('Custom Auth Service: Sign up response:', data);

      if (data.UserSub) {
        return {
          success: true,
        };
      } else {
        return {
          success: false,
          error: data.message || 'Sign up failed',
        };
      }
    } catch (error: any) {
      console.error('Custom Auth Service: Sign up error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  async confirmSignUp(username: string, confirmationCode: string): Promise<AuthResult> {
    try {
      console.log('Custom Auth Service: Confirming sign up...');
      
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.ConfirmSignUp',
        },
        body: JSON.stringify({
          ClientId: this.clientId,
          Username: username,
          ConfirmationCode: confirmationCode,
        }),
      });

      const data = await response.json();
      console.log('Custom Auth Service: Confirm response:', data);

      if (response.ok) {
        return {
          success: true,
        };
      } else {
        return {
          success: false,
          error: data.message || 'Confirmation failed',
        };
      }
    } catch (error: any) {
      console.error('Custom Auth Service: Confirm error:', error);
      return {
        success: false,
        error: error.message || 'Network error',
      };
    }
  }

  async signOut(): Promise<void> {
    try {
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('idToken');
      console.log('Custom Auth Service: Signed out');
    } catch (error) {
      console.error('Custom Auth Service: Sign out error:', error);
    }
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      return !!accessToken;
    } catch (error) {
      return false;
    }
  }
}

export const authService = new AuthService(); 