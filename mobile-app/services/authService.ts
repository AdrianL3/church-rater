// src/services/authService.ts
import {
  signIn,
  signUp,
  confirmSignUp,
  signOut,
  getCurrentUser,
  fetchAuthSession,
  resetPassword,
  confirmResetPassword,
} from 'aws-amplify/auth';

type Result = { success: true; data?: any } | { success: false; error: string };

function mapErr(e: any) {
  console.log('Auth error object:', JSON.stringify(e, null, 2));
  return e?.message || e?.name || e?.__type || 'Auth error';
}

export const authService = {
  async signIn(username: string, password: string) {
    try {
      let out;
      try {
        out = await signIn({ username, password });
      } catch {
        // @ts-ignore
        out = await signIn({ username, password, options: { authFlowType: 'USER_PASSWORD_AUTH' } });
      }
      // Ensure tokens are present (will auto-refresh if needed)
      await fetchAuthSession();
      return { success: true, data: out as any };
    } catch (e) {
      return { success: false, error: mapErr(e) };
    }
  },

  async signUp(username: string, email: string, password: string): Promise<Result> {
    try {
      const out = await signUp({ username, password, options: { userAttributes: { email } } });
      return { success: true, data: out };
    } catch (e) {
      return { success: false, error: mapErr(e) };
    }
  },

  async confirmSignUp(username: string, code: string): Promise<Result> {
    try {
      await confirmSignUp({ username, confirmationCode: code });
      return { success: true };
    } catch (e) {
      return { success: false, error: mapErr(e) };
    }
  },

  async signOut(): Promise<Result> {
    try {
      await signOut();
      return { success: true };
    } catch (e) {
      return { success: false, error: mapErr(e) };
    }
  },

  // Returns true if we currently have (or can refresh) tokens
  async isSignedIn(): Promise<boolean> {
    try {
      const s = await fetchAuthSession();               // triggers refresh if possible
      return !!s.tokens?.idToken;
    } catch {
      return false;
    }
  },

  // Try a forced refresh before giving up (useful when you got a 401 once)
  async ensureFreshSession(): Promise<boolean> {
    try {
      // @ts-ignore – forceRefresh is supported in Amplify 6
      const s = await fetchAuthSession({ forceRefresh: true });
      return !!s.tokens?.idToken;
    } catch {
      return false;
    }
  },

  async getIdToken(): Promise<string | null> {
    try {
      const { tokens } = await fetchAuthSession();      // auto-refreshes if needed
      return tokens?.idToken?.toString() ?? null;
    } catch {
      return null;
    }
  },

  // Forgot password helpers already added earlier
  async requestPasswordReset(username: string): Promise<Result> {
    try {
      await resetPassword({ username });
      return { success: true };
    } catch (e) {
      return { success: false, error: mapErr(e) };
    }
  },

  async confirmPasswordReset(username: string, code: string, newPassword: string): Promise<Result> {
    try {
      await confirmResetPassword({ username, confirmationCode: code, newPassword });
      return { success: true };
    } catch (e) {
      return { success: false, error: mapErr(e) };
    }
  },
};
