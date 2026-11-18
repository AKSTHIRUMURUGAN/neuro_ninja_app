import { syncEngine, type CloudUserProfile } from '../sync/sync-engine';

export class AuthService {
  public async signInWithEmail(
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string; user?: CloudUserProfile }> {
    return await syncEngine.login(email, pass);
  }

  public async signUpWithEmail(
    email: string,
    pass: string,
    name: string
  ): Promise<{ success: boolean; error?: string; user?: CloudUserProfile }> {
    return await syncEngine.register(email, pass, name);
  }

  public async signInWithGoogle(user: {
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
  }): Promise<{ success: boolean; error?: string; user?: CloudUserProfile }> {
    return await syncEngine.loginWithOAuth(user, 'google', false);
  }

  public async signOut(): Promise<void> {
    await syncEngine.logout();
  }

  public async getCurrentUser(): Promise<CloudUserProfile | null> {
    return await syncEngine.getUserProfile();
  }

  public async isAuthenticated(): Promise<boolean> {
    const token = await syncEngine.getAuthToken();
    return Boolean(token);
  }

  public async getAuthToken(): Promise<string | null> {
    return await syncEngine.getAuthToken();
  }
}

export const authService = new AuthService();
