import { api } from './api';

export type ApiRole = 'user' | 'doctor' | 'store manager' | 'super admin';
export type ApiUser = {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'others';
  age?: number;
  address?: string;
  role: ApiRole;
  profileImage?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  isActive?: boolean;
  isOnBoardingCompleted?: boolean;
  isSubscribed?: boolean;
  subscriptionPlan?: string;
  createdAt?: string;
};
export type Session = { token: string; user: ApiUser; restored?: boolean };

/** Returned for a Google e-mail with no account yet. Pass `signupToken` to `register` as `googleSignupToken`. */
export type GoogleProfile = {
  email: string;
  name?: string;
  picture?: string;
  googleId: string;
  signupToken: string;
};

/** Returned for an Apple ID with no account yet. Pass `signupToken` to `register` as `appleSignupToken`. */
export type AppleProfile = {
  email: string;
  name?: string;
  appleId: string;
  signupToken: string;
};

/** The backend wants an e-mail in lower case or an E.164 phone number (+919876543210, no spaces). */
export const normalizeIdentifier = (v: string) => {
  const t = v.trim();
  return t.includes('@') ? t.toLowerCase() : t.replace(/[\s()-]/g, '');
};

export const authService = {
  /** type "login" fails for unknown users, "signup" fails for existing ones. */
  async sendOtp(identifier: string, type: 'login' | 'signup', restore = false) {
    // `restore: true` = the person said yes to "Restore your account?" (account deleted < 90 days ago)
    const { data } = await api.post('/auth/send-otp', { identifier: normalizeIdentifier(identifier), type, ...(restore === true ? { restore: true } : {}) });
    return data as { success: boolean; message: string };
  },

  async deleteAccount() {
    await api.delete('/auth/delete-account');
  },
  async verifyOtp(identifier: string, otp: string): Promise<Session> {
    const id = normalizeIdentifier(identifier);
    const { data } = await api.post('/auth/verify-otp', id.includes('@') ? { email: id, otp } : { phone: id, otp });
    return { token: data.token, user: data.user, restored: data.restored === true };
  },

  /**
   * Sign up with one of:
   *  - `identifier` + `otp`
   *  - `googleSignupToken` (= googleProfile.signupToken from `googleLogin`)
   *  - `appleSignupToken`  (= appleProfile.signupToken from `appleLogin`)
   * For the Google / Apple routes no identifier/otp is needed: the server
   * takes the verified e-mail from the signed token.
   */
  async register(p: {
    name: string;
    identifier?: string;
    otp?: string;
    googleSignupToken?: string;
    appleSignupToken?: string;
    role: ApiRole;
    profileImage?: string;
  }): Promise<Session> {
    const { data } = await api.post('/auth/register', {
      ...p,
      identifier: p.identifier ? normalizeIdentifier(p.identifier) : undefined,
      termsAccepted: true,
    });
    return { token: data.token, user: data.user };
  },

  /** Existing account -> a session. Unknown e-mail -> `isNewUser` + the Google profile to prefill sign-up. */
  async googleLogin(accessToken: string, restore = false) {
    const { data } = await api.post('/auth/google', { accessToken, ...(restore === true ? { restore: true } : {}) });
    return data as
      | { success: true; token: string; user: ApiUser; restored?: boolean; isNewUser?: undefined }
      | { success: true; isNewUser: true; googleProfile: GoogleProfile };
  },

  /** Existing account -> a session. Unknown Apple ID -> `isNewUser` + the Apple profile to prefill sign-up. */
  async appleLogin(
    p: { identityToken: string; email?: string; fullName?: string },
    restore = false,
  ) {
    const { data } = await api.post('/auth/apple', { ...p, ...(restore === true ? { restore: true } : {}) });
    return data as
      | { success: true; token: string; user: ApiUser; restored?: boolean; isNewUser?: undefined }
      | { success: true; isNewUser: true; appleProfile: AppleProfile };
  },

  async getProfile(): Promise<ApiUser> {
    const { data } = await api.get('/users/profile');
    return data.user;
  },

  async updateProfile(p: { name: string; gender?: string; address?: string; phone?: string; email?: string; age?: number; imageUri?: string }) {
    const form = new FormData();
    form.append('name', p.name);
    if (p.gender) form.append('gender', p.gender);
    if (p.address !== undefined) form.append('address', p.address);
    if (p.phone) form.append('phone', p.phone);
    if (p.email) form.append('email', p.email);
    if (p.age !== undefined) form.append('age', String(p.age));
    if (p.imageUri) {
      const name = p.imageUri.split('/').pop() || 'avatar.jpg';
      form.append('profileImage', { uri: p.imageUri, name, type: 'image/jpeg' } as any);
    }
    const { data } = await api.put('/users/profile', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return data.user as ApiUser;
  },
};