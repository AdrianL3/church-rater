// src/services/authService.ts
import {
  signIn,
  signUp,
  confirmSignUp,
  signOut,
  getCurrentUser,
  fetchAuthSession,
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
        // 1) SRP (preferred)
        out = await signIn({ username, password });
      } catch (e1) {
        console.log('SRP failed, trying USER_PASSWORD_AUTH');
        // 2) Non-SRP (requires "User password" enabled on the app client)
        // @ts-ignore  (Amplify v6 supports this option even if types lag)
        out = await signIn({ username, password, options: { authFlowType: 'USER_PASSWORD_AUTH' } });
      }

      // If your pool uses next steps (MFA/confirm/reset), handle here if needed:
      // if (!out.isSignedIn) console.log('nextStep:', out.nextStep);

      const { tokens } = await fetchAuthSession();
      if (!tokens?.idToken) throw new Error('No ID token after sign-in');

      return { success: true, data: out as any };
    } catch (e) {
      return { success: false, error: detail(e) };
    }
  },
  async signUp(username: string, email: string, password: string): Promise<Result> {
    try {
      const out = await signUp({
        username,
        password,
        options: { userAttributes: { email } },
      });
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
  async isSignedIn(): Promise<boolean> {
    try {
      await getCurrentUser();
      return true;
    } catch {
      return false;
    }
  },
  async getIdToken(): Promise<string | null> {
    const { tokens } = await fetchAuthSession();
    return tokens?.idToken?.toString() ?? null;
  },
};
function detail(e: unknown) {
  throw new Error('Function not implemented.');
}

