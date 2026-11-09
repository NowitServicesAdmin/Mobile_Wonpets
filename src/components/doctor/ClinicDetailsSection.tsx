import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Field } from '../ui';
import { WonPetsAlert } from '../WonPetsAlert';
import { FormSkeleton } from '../Skeletons';
import LocationPicker from '../settings/LocationPicker';
import { FormCard, Notice } from './ProfileBits';
import { AdditionalInfo } from '../../data/settings';
import { PlaceDetails } from '../../services/location.service';
import { errorMessage } from '../../services/api';
import { settingsService } from '../../services/settings.service';
import { useSettings } from '../../context/SettingsContext';
import { useDoctor } from '../../context/DoctorContext';

/** Web "Additional Information" for doctors: clinic name, specialization, experience and the clinic address.
 *  The address feeds KYC, and the server freezes it once KYC is activated - those fields then show as locked. */
export default function ClinicDetailsSection() {
  const { info, infoLoaded, saveInfo } = useSettings();
  const { refreshProfile } = useDoctor();
  const [f, setF] = useState<AdditionalInfo>(info);
  const [lock, setLock] = useState<{ locked: boolean; fields: string[] }>({ locked: false, fields: [] });
  const [saving, setSaving] = useState(false);
  useEffect(() => setF(info), [info]); // refresh once the server copy has loaded
  useEffect(() => { settingsService.getInfoLock().then(setLock).catch(() => {}); }, []);

  const locked = (name: string) => lock.locked && lock.fields.includes(name);
  const addressLocked = locked('location');
  const set = (p: Partial<AdditionalInfo>) => setF((x) => ({ ...x, ...p }));

  const pickPlace = (p: PlaceDetails | null) =>
    set({
      location: p?.address ?? '', formattedAddress: p?.address ?? '', address: p?.address ?? '', clinicAddress: p?.address ?? '',
      city: p?.city ?? '', district: p?.district ?? '', state: p?.state ?? '', country: p?.country ?? '', pincode: p?.pincode ?? '',
      placeId: p?.placeId ?? '', latitude: p?.latitude ?? '', longitude: p?.longitude ?? '',
    });

  const save = async () => {
    setSaving(true);
    try {
      await saveInfo({ ...f, clinicName: (f.clinicName ?? '').trim(), specialization: (f.specialization ?? '').trim(), clinicAddress: f.clinicAddress || f.address });
      refreshProfile(); // hero chips (specialization / clinic / experience) update right away
      settingsService.getInfoLock().then(setLock).catch(() => {});
      WonPetsAlert.success('Updated', 'Clinic details updated successfully.');
    } catch (e) {
      WonPetsAlert.error('Save failed', errorMessage(e));
    } finally { setSaving(false); }
  };

  if (!infoLoaded) return <FormCard icon="medkit-outline" title="Clinic details"><FormSkeleton fields={4} /></FormCard>;

  return (
    <View className="gap-3.5">
      {lock.locked && <Notice tone="success">Your clinic address is <Text className="font-extrabold">locked</Text> because your KYC is activated. Please contact WonPets support if it needs to change. Your other details can still be edited.</Notice>}

      <FormCard icon="medkit-outline" title="About your practice">
        <Field label="Clinic name" value={f.clinicName ?? ''} onChangeText={(v) => set({ clinicName: v })} placeholder="Enter clinic name" editable={!locked('clinicName')} />
        <Field label="Specialization" value={f.specialization ?? ''} onChangeText={(v) => set({ specialization: v })} placeholder="e.g. Small animal surgery" editable={!locked('specialization')} />
        <Field label="Experience (years)" value={f.experience != null && f.experience !== '' ? String(f.experience) : ''} onChangeText={(v) => set({ experience: v.replace(/[^\d]/g, '').slice(0, 2) })} placeholder="Enter experience" keyboardType="number-pad" editable={!locked('experience')} />
      </FormCard>

      <FormCard icon="location-outline" title="Clinic address">
        <LocationPicker label="Clinic location" value={f.formattedAddress || f.location} onChange={pickPlace} disabled={addressLocked} />
        <Field label="Door / Flat No" value={f.doorNo} onChangeText={(v) => set({ doorNo: v })} placeholder="Enter Door / Flat No" editable={!locked('doorNo')} />
        {!!f.location && (
          <View className="rounded-2xl bg-cream border border-line p-3.5 gap-2.5">
            <View className="flex-row items-center gap-1.5"><Ionicons name="lock-closed" size={12} color={colors.muted} /><Text className="text-xs text-muted flex-1">{addressLocked ? 'Locked after KYC activation.' : 'Filled in from your location. Search again to change.'}</Text></View>
            <Text className="text-[14px] font-semibold text-ink leading-5">{f.clinicAddress || f.address}</Text>
            <View className="flex-row flex-wrap gap-2">
              {[f.city, f.district, f.state, f.country, f.pincode].filter(Boolean).map((v, i) => (
                <View key={`${v}-${i}`} className="bg-white border border-line rounded-full px-3 py-1"><Text className="text-xs font-semibold text-ink">{v}</Text></View>
              ))}
            </View>
          </View>
        )}
        <Text className="text-xs text-muted">This address is also used for your KYC, so you won't be asked for it again.</Text>
      </FormCard>

      <Button disabled={saving} title={saving ? 'Saving…' : 'Save Changes'} icon={<Ionicons name="checkmark-circle-outline" size={19} color="#fff" />} onPress={save} />
    </View>
  );
}
