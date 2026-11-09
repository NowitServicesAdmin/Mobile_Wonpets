import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Field } from '../ui';
import { WonPetsAlert } from '../WonPetsAlert';
import { FormSkeleton } from '../Skeletons';
import CustomDropdown from '../CustomDropdown';
import LocationPicker from '../settings/LocationPicker';
import { FormCard, Notice } from '../doctor/ProfileBits';
import { FieldLabel } from './SMUI';
import { AdditionalInfo } from '../../data/settings';
import { PlaceDetails } from '../../services/location.service';
import { errorMessage } from '../../services/api';
import { settingsService } from '../../services/settings.service';
import { useSettings } from '../../context/SettingsContext';

const STORE_CATEGORIES = ['Pet Food', 'Pet Accessories', 'Pet Medicines', 'Pet Grooming'].map((v) => ({ value: v, label: v }));
const GST = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Web "Additional Information" for store managers: store name, category, GST and the store address.
 *  The address is reused for KYC and courier pickups; the server freezes it once KYC is activated and pickups are ready. */
export default function StoreDetailsSection({ onSaved }: { onSaved?: () => void }) {
  const { info, infoLoaded, saveInfo } = useSettings();
  const [f, setF] = useState<AdditionalInfo>(info);
  const [lock, setLock] = useState<{ locked: boolean; fields: string[] }>({ locked: false, fields: [] });
  const [saving, setSaving] = useState(false);
  useEffect(() => setF(info), [info]);
  useEffect(() => { settingsService.getInfoLock().then(setLock).catch(() => {}); }, []);

  const locked = (name: string) => lock.locked && lock.fields.includes(name);
  const addressLocked = locked('location') || locked('storeAddress');
  const set = (p: Partial<AdditionalInfo>) => setF((x) => ({ ...x, ...p }));

  const pickPlace = (p: PlaceDetails | null) =>
    set({
      location: p?.address ?? '', formattedAddress: p?.address ?? '', address: p?.address ?? '', storeAddress: p?.address ?? '',
      city: p?.city ?? '', district: p?.district ?? '', state: p?.state ?? '', country: p?.country ?? '', pincode: p?.pincode ?? '',
      placeId: p?.placeId ?? '', latitude: p?.latitude ?? '', longitude: p?.longitude ?? '',
    });

  const save = async () => {
    const gst = (f.gstNumber ?? '').trim().toUpperCase();
    if (gst && !GST.test(gst)) return WonPetsAlert.warning('Check GST number', 'Enter a valid 15-character GSTIN, or leave it empty.');
    if (f.pincode && !/^\d{6}$/.test(String(f.pincode))) return WonPetsAlert.warning('Check pincode', 'Couriers need a 6-digit pincode. Pick your store location again.');
    setSaving(true);
    try {
      await saveInfo({ ...f, storeName: (f.storeName ?? '').trim(), gstNumber: gst, storeAddress: f.storeAddress || f.address });
      settingsService.getInfoLock().then(setLock).catch(() => {});
      onSaved?.();
      WonPetsAlert.success('Updated', 'Store details updated successfully.');
    } catch (e) {
      WonPetsAlert.error('Save failed', errorMessage(e));
    } finally { setSaving(false); }
  };

  if (!infoLoaded) return <FormCard icon="storefront-outline" title="Store details"><FormSkeleton fields={4} /></FormCard>;

  return (
    <View className="gap-3.5">
      {lock.locked && <Notice tone="success">Your store address is <Text className="font-extrabold">locked</Text> because your KYC is activated and your pickup address is ready. Contact WonPets support if it needs to change. Your store name and other details can still be edited.</Notice>}

      <FormCard icon="storefront-outline" title="About your store">
        <Field label="Store name" value={f.storeName ?? ''} onChangeText={(v) => set({ storeName: v })} placeholder="Enter store name" editable={!locked('storeName')} />
        <View>
          <FieldLabel>Store category</FieldLabel>
          <CustomDropdown value={f.storeCategory ?? ''} onChange={(v) => set({ storeCategory: v })} options={STORE_CATEGORIES} searchable={false} placeholder="Select category" title="Store category" disabled={locked('storeCategory')} />
        </View>
        <Field label="GST number" value={f.gstNumber ?? ''} onChangeText={(v) => set({ gstNumber: v.replace(/\s/g, '').toUpperCase().slice(0, 15) })} placeholder="e.g. 37ABCDE1234F1Z5" autoCapitalize="characters" editable={!locked('gstNumber')} hint="Optional" />
      </FormCard>

      <FormCard icon="location-outline" title="Store address">
        <LocationPicker label="Store location" value={f.formattedAddress || f.location} onChange={pickPlace} disabled={addressLocked} />
        <Field label="Door / Flat No" value={f.doorNo} onChangeText={(v) => set({ doorNo: v })} placeholder="Enter Door / Flat No" editable={!locked('doorNo')} />
        {!!f.location && (
          <View className="rounded-2xl bg-cream border border-line p-3.5 gap-2.5">
            <View className="flex-row items-center gap-1.5"><Ionicons name="lock-closed" size={12} color={colors.muted} /><Text className="text-xs text-muted flex-1">{addressLocked ? 'Locked after KYC activation.' : 'Filled in from your location. Search again to change.'}</Text></View>
            <Text className="text-[14px] font-semibold text-ink leading-5">{f.storeAddress || f.address}</Text>
            <View className="flex-row flex-wrap gap-2">
              {[f.city, f.district, f.state, f.country, f.pincode].filter(Boolean).map((v, i) => (
                <View key={`${v}-${i}`} className="bg-white border border-line rounded-full px-3 py-1"><Text className="text-xs font-semibold text-ink">{v}</Text></View>
              ))}
            </View>
          </View>
        )}
        <Text className="text-xs text-muted">This address is reused for KYC and courier pickups, so you won't be asked for it again.</Text>
      </FormCard>

      <Button disabled={saving} title={saving ? 'Saving…' : 'Save Changes'} icon={<Ionicons name="checkmark-circle-outline" size={19} color="#fff" />} onPress={save} />
    </View>
  );
}
