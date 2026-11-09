import { api } from './api';

export type KycStatus = 'not_started' | 'needs_clarification' | 'under_review' | 'activated' | 'rejected';
export type KycForm = { accountHolderName: string; bankName: string; accountNumber: string; ifsc: string; pan: string };
export type KycData = { status: KycStatus; form: KycForm; locked: boolean; lockedMessage: string };

export const emptyKyc: KycForm = { accountHolderName: '', bankName: '', accountNumber: '', ifsc: '', pan: '' };

/** Payout (KYC) details - the same /kyc endpoints the web Settings > KYC Details section uses. */
export const kycService = {
  async get(): Promise<KycData> {
    const { data } = await api.get('/kyc/me');
    const k = data.kyc;
    return {
      status: (k?.accountStatus as KycStatus) || 'not_started',
      form: k
        ? { accountHolderName: k.legal_name || '', bankName: k.bank?.bank_name || '', accountNumber: k.bank?.account_number || '', ifsc: k.bank?.ifsc_code || '', pan: k.pan || '' }
        : emptyKyc,
      locked: !!data.locked,
      lockedMessage: data.lockedMessage || '',
    };
  },
  /** Email + phone come from the account (the server needs both); the address is the one saved in clinic details. */
  async submit(f: KycForm, who: { email: string; phone: string }): Promise<KycStatus | undefined> {
    const { data } = await api.post('/kyc/submit', {
      legal_name: f.accountHolderName.trim(),
      email: who.email,
      phone: who.phone,
      pan: f.pan.trim(),
      bank: { bank_name: f.bankName.trim(), account_holder_name: f.accountHolderName.trim(), account_number: f.accountNumber.trim(), ifsc_code: f.ifsc.trim() },
    });
    return data.kyc?.accountStatus as KycStatus | undefined;
  },
};
