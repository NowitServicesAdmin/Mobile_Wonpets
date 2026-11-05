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
export type Session = { token: string; user: ApiUser };

/** The backend wants an e-mail in lower case or an E.164 phone number (+919876543210, no spaces). */
export const normalizeIdentifier = (v: string) => {
  const t = v.trim();
  return t.includes('@') ? t.toLowerCase() : t.replace(/[\s()-]/g, '');
};

export const authService = {
  /** type "login" fails for unknown users, "signup" fails for existing ones. */
  async sendOtp(identifier: string, type: 'login' | 'signup') {
    const { data } = await api.post('/auth/send-otp', { identifier: normalizeIdentifier(identifier), type });
    return data as { success: boolean; message: string };
  },

  async deleteAccount() {
    await api.delete('/auth/delete-account');
  },
  async verifyOtp(identifier: string, otp: string): Promise<Session> {
    const id = normalizeIdentifier(identifier);
    const { data } = await api.post('/auth/verify-otp', id.includes('@') ? { email: id, otp } : { phone: id, otp });
    return { token: data.token, user: data.user };
  },

  async register(p: {
    name: string;
    identifier: string;
    otp?: string;
    googleId?: string;
    role: ApiRole;
    gender: 'male' | 'female' | 'others';
    profileImage?: string;
  }): Promise<Session> {
    const { data } = await api.post('/auth/register', {
      ...p,
      identifier: normalizeIdentifier(p.identifier),
      termsAccepted: true,
    });
    return { token: data.token, user: data.user };
  },

  /** Existing account -> a session. Unknown e-mail -> `isNewUser` + the Google profile to prefill sign-up. */
  async googleLogin(accessToken: string) {
    const { data } = await api.post('/auth/google', { accessToken });
    return data as
      | { success: true; token: string; user: ApiUser; isNewUser?: undefined }
      | { success: true; isNewUser: true; googleProfile: { email: string; name: string; picture?: string; googleId: string } };
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
