import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Chip, Field, Tone } from '../ui';
import { WonPetsAlert, toast } from '../WonPetsAlert';
import { FormSkeleton } from '../Skeletons';
import { FormCard, Notice } from './ProfileBits';
import { KycData, KycForm, KycStatus, emptyKyc, kycService } from '../../services/kyc.service';
import { errorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const KYC_STATUS: Record<KycStatus, { label: string; tone: Tone }> = {
  not_started: { label: 'Not started', tone: 'orange' },
  needs_clarification: { label: 'Needs clarification', tone: 'yellow' },
  under_review: { label: 'Under review', tone: 'blue' },
  activated: { label: 'Activated', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'red' },
};

const IFSC = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PAN = /^[A-Z]{5}\d{4}[A-Z]$/;

/** Bank + PAN details a doctor needs to receive consultation payouts (web Settings > KYC Details). */
export default function KycSection({ onStatus }: { onStatus?: (s: KycStatus) => void }) {
  const { user } = useAuth();
  const [data, setData] = useState<KycData | null>(null);
  const [form, setForm] = useState<KycForm>(emptyKyc);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = () => kycService.get().then((d) => { setData(d); setForm(d.form); onStatus?.(d.status); setFailed(false); }).catch((e) => { setFailed(true); toast.error(errorMessage(e)); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  if (failed && !data) return <FormCard icon="card-outline" title="KYC & payouts"><Text className="text-sm text-muted">Could not load your KYC details.</Text><Button variant="outline" title="Try again" onPress={load} /></FormCard>;
  if (!data) return <FormCard icon="card-outline" title="KYC & payouts"><FormSkeleton fields={4} /></FormCard>;

  const { status, locked, lockedMessage } = data;
  const st = KYC_STATUS[status];
  const set = (p: Partial<KycForm>) => setForm((x) => ({ ...x, ...p }));

  const save = async () => {
    if (locked) return;
    if (!user?.email || !user?.phone) return WonPetsAlert.warning('Profile Incomplete', 'Your profile is missing an email or phone number. Please add it in Profile first.');
    if (!form.accountHolderName.trim() || !form.bankName.trim() || !form.accountNumber.trim() || !form.ifsc.trim()) return WonPetsAlert.warning('Details missing', 'Please fill in the account holder name, bank name, account number and IFSC code.');
    if (!/^\d{6,20}$/.test(form.accountNumber.trim())) return WonPetsAlert.warning('Check account number', 'The account number should contain digits only.');
    if (!IFSC.test(form.ifsc.trim())) return WonPetsAlert.warning('Check IFSC code', 'An IFSC code looks like HDFC0001234.');
    if (form.pan.trim() && !PAN.test(form.pan.trim())) return WonPetsAlert.warning('Check PAN', 'A PAN looks like ABCDE1234F.');
    setSaving(true);
    try {
      await kycService.submit(form, { email: user.email, phone: user.phone });
      await load();
      WonPetsAlert.success('KYC Submitted', 'Your KYC details have been submitted.');
    } catch (e) {
      WonPetsAlert.error('KYC failed', errorMessage(e));
    } finally { setSaving(false); }
  };

  return (
    <View className="gap-3.5">
      <FormCard icon="card-outline" title="KYC & payouts" right={<Chip label={st.label} tone={st.tone} />}>
        {locked && <Notice tone="success"><Text className="font-extrabold">Locked. </Text>{lockedMessage || 'Your KYC is activated, so these details are locked. Please contact WonPets support if you need to change them.'}</Notice>}
        {status === 'needs_clarification' && <Notice tone="warning">The review team needs a correction. Update your details and submit again.</Notice>}
        {status === 'rejected' && <Notice tone="warning">Your KYC was rejected. Check the details below and submit again, or contact WonPets support.</Notice>}

        <Field label="Account holder name" value={form.accountHolderName} onChangeText={(v) => set({ accountHolderName: v })} placeholder="As per bank passbook" editable={!locked} />
        <Field label="Bank name" value={form.bankName} onChangeText={(v) => set({ bankName: v })} placeholder="e.g. HDFC Bank" editable={!locked} />
        <Field label="Account number" value={form.accountNumber} onChangeText={(v) => set({ accountNumber: v.replace(/[^\d]/g, '') })} placeholder="Bank account number" keyboardType="number-pad" editable={!locked} />
        <Field label="IFSC code" value={form.ifsc} onChangeText={(v) => set({ ifsc: v.toUpperCase().replace(/\s/g, '') })} placeholder="e.g. HDFC0001234" autoCapitalize="characters" autoCorrect={false} maxLength={11} editable={!locked} />
        <Field label="PAN (optional)" value={form.pan} onChangeText={(v) => set({ pan: v.toUpperCase().replace(/\s/g, '') })} placeholder="ABCDE1234F" autoCapitalize="characters" autoCorrect={false} maxLength={10} editable={!locked} />

        <Notice tone="info">Your address is taken from <Text className="font-extrabold">Clinic details</Text> - you don't need to enter it again here. Update it there if it has changed.</Notice>
      </FormCard>

      {!locked && <Button disabled={saving} title={saving ? 'Saving…' : 'Submit KYC'} icon={<Ionicons name="shield-checkmark-outline" size={19} color="#fff" />} onPress={save} />}
    </View>
  );
}
