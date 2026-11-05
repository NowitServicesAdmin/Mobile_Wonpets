import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Field } from '../ui';
import { WonPetsAlert, toast } from '../WonPetsAlert';
import LocationPicker from './LocationPicker';
import { AdditionalInfo } from '../../data/settings';
import { PlaceDetails } from '../../services/location.service';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../services/api';
import { FormSkeleton } from '../Skeletons';

/**
 * Same behaviour as the web "Additional Information" card: the location comes from the picker
 * (search or current position) and the address parts are filled in from it and are read-only.
 * Only Door / Flat No can be typed.
 */
export default function AdditionalInfoSection() {
  const { info, infoLoaded, saveInfo } = useSettings();
  const { user, updateProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState<AdditionalInfo>(info);
  useEffect(() => setF(info), [info]); // refresh once the server copy has loaded

  const pickPlace = (p: PlaceDetails | null) =>
    setF((x) => ({
      ...x,
      location: p?.address ?? '',
      formattedAddress: p?.address ?? '',
      address: p?.address ?? '',
      city: p?.city ?? '',
      district: p?.district ?? '',
      state: p?.state ?? '',
      country: p?.country ?? '',
      pincode: p?.pincode ?? '',
      placeId: p?.placeId ?? '',
      latitude: p?.latitude ?? '',
      longitude: p?.longitude ?? '',
    }));

  const save = async () => {
    if (!f.location.trim()) return toast.error('Please choose your location.');
    setSaving(true);
    try {
      await saveInfo(f);
      // the account address on the profile mirrors the location
      if (user) await updateProfile({ name: user.name, gender: user.gender, location: f.location.trim() });
      WonPetsAlert.success('Updated', 'Additional information updated successfully.');
    } catch (e) {
      WonPetsAlert.error('Could not save', errorMessage(e));
    } finally { setSaving(false); }
  };

  if (!infoLoaded) return <FormSkeleton fields={5} />;

  return (
    <View className="gap-3">
      <LocationPicker label="Location" value={f.formattedAddress || f.location} onChange={pickPlace} />
      <Field label="Door / Flat No" value={f.doorNo} onChangeText={(v) => setF((x) => ({ ...x, doorNo: v }))} placeholder="Enter Door / Flat No" />
      <View className="flex-row items-center gap-1.5 -mb-1"><Ionicons name="lock-closed" size={12} color={colors.muted} /><Text className="text-xs text-muted flex-1">The details below are filled in from your location. Search again to change them.</Text></View>
      <Field label="Area / Street" value={f.address} editable={false} placeholder="Auto filled" multiline />
      <View className="flex-row gap-3"><Field className="flex-1" label="City" value={f.city} editable={false} placeholder="Auto filled" /><Field className="flex-1" label="District" value={f.district} editable={false} placeholder="Auto filled" /></View>
      <View className="flex-row gap-3"><Field className="flex-1" label="State" value={f.state} editable={false} placeholder="Auto filled" /><Field className="flex-1" label="Country" value={f.country} editable={false} placeholder="Auto filled" /></View>
      <Field label="Pincode" value={f.pincode} editable={false} placeholder="Auto filled" />
      <Button disabled={saving} title={saving ? 'Saving…' : 'Save'} icon={<Ionicons name="save-outline" size={18} color="#fff" />} onPress={save} />
    </View>
  );
}
