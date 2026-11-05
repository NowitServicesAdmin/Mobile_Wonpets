import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme';
import { Button, Field, T, cn } from '../ui';
import { WonPetsAlert } from '../WonPetsAlert';
import LocationPicker from './LocationPicker';
import LanguageSection from './LanguageSection';
import { FormSkeleton } from '../Skeletons';
import { AdditionalInfo } from '../../data/settings';
import { PlaceDetails } from '../../services/location.service';
import { errorMessage } from '../../services/api';
import { authService } from '../../services/auth.service';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useLanguage } from '../../context/LanguageContext';

type IconName = keyof typeof Ionicons.glyphMap;

/** A titled white card. */
function Section({ icon, title, children, tone = 'orange' }: { icon: IconName; title: string; children: React.ReactNode; tone?: 'orange' | 'red' }) {
  return (
    <View className={cn('bg-white rounded-3xl border p-4 gap-3.5', tone === 'red' ? 'border-red/30' : 'border-orange-100')}>
      <View className="flex-row items-center gap-2.5">
        <View className={cn('w-8 h-8 rounded-xl items-center justify-center', tone === 'red' ? 'bg-red-soft' : 'bg-primary-soft')}><Ionicons name={icon} size={17} color={tone === 'red' ? colors.red : colors.primary} /></View>
        <Text className={cn('text-[16px] font-extrabold', tone === 'red' ? 'text-red' : 'text-ink')}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

/** Read-only value (email / mobile) with a lock so it is clear it can't be edited. */
function LockedRow({ icon, label, value }: { icon: IconName; label: string; value?: string }) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-cream border border-line px-3.5 py-3">
      <Ionicons name={icon} size={18} color={colors.muted} />
      <View className="flex-1"><Text className={T.small}>{label}</Text><Text numberOfLines={1} className="text-[15px] font-semibold text-ink">{value || '—'}</Text></View>
      <Ionicons name="lock-closed" size={14} color={colors.muted} />
    </View>
  );
}

/** Everything about you on one page: photo, personal details, address, language - and delete account at the bottom. */
export default function ProfileSection() {
  const { user, updateProfile, signOut } = useAuth();
  const { info, infoLoaded, saveInfo } = useSettings();
  const { language } = useLanguage();
  const [name, setName] = useState(user?.name ?? '');
  const [gender, setGender] = useState<'male' | 'female'>(user?.gender === 'male' ? 'male' : 'female');
  const [photo, setPhoto] = useState<string | undefined>(user?.profileImage);
  const [newPhoto, setNewPhoto] = useState<string | undefined>();
  const [f, setF] = useState<AdditionalInfo>(info);
  const [langOpen, setLangOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => setF(info), [info]); // refresh once the server copy has loaded

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!r.canceled) { setPhoto(r.assets[0].uri); setNewPhoto(r.assets[0].uri); }
  };

  const pickPlace = (p: PlaceDetails | null) =>
    setF((x) => ({
      ...x,
      location: p?.address ?? '', formattedAddress: p?.address ?? '', address: p?.address ?? '',
      city: p?.city ?? '', district: p?.district ?? '', state: p?.state ?? '', country: p?.country ?? '', pincode: p?.pincode ?? '',
      placeId: p?.placeId ?? '', latitude: p?.latitude ?? '', longitude: p?.longitude ?? '',
    }));

  const save = async () => {
    if (!name.trim()) return WonPetsAlert.error('Name required', 'Please enter your name.');
    setSaving(true);
    try {
      const loc = f.location.trim();
      if (loc) await saveInfo(f); // address lives in Additional Information on the server
      await updateProfile({ name: name.trim(), gender, imageUri: newPhoto, ...(loc ? { location: loc } : {}) });
      setNewPhoto(undefined);
      WonPetsAlert.success('Profile Updated', 'Your profile has been updated successfully.');
    } catch (e) {
      WonPetsAlert.error('Could not update profile', errorMessage(e));
    } finally { setSaving(false); }
  };

  const deleteAccount = async () => {
    const r = await WonPetsAlert.delete('Delete your account?', 'This permanently deletes your account, pets, appointments and records. This cannot be undone.', { confirmText: 'Delete account' });
    if (!r.isConfirmed) return;
    setDeleting(true);
    try {
      await authService.deleteAccount();
      await signOut(); // back to the login screen
    } catch (e) {
      setDeleting(false);
      WonPetsAlert.error('Could not delete account', errorMessage(e));
    }
  };

  return (
    <View className="gap-3.5">
      {/* hero: photo + who you are */}
      <View className="items-center bg-white rounded-3xl border border-orange-100 pt-5 pb-4 px-4 gap-1">
        <Pressable onPress={pick} accessibilityRole="button" accessibilityLabel="Change profile photo">
          <View className="rounded-full p-0.5 bg-orange-300">
            <View className="w-[104px] h-[104px] rounded-full bg-primary-soft border-2 border-white items-center justify-center overflow-hidden">
              {photo ? <Image source={{ uri: photo }} className="w-full h-full" /> : <Text className="text-[50px]">🦅</Text>}
            </View>
          </View>
          <View className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary items-center justify-center border-[3px] border-white"><Ionicons name="camera" size={16} color="#fff" /></View>
        </Pressable>
        <Text numberOfLines={1} className="text-[19px] font-black text-ink mt-2">{user?.name || 'Your name'}</Text>
        <Text numberOfLines={1} className="text-[13px] text-muted">{user?.email || user?.phone}</Text>
        <Text className="text-[12px] text-primary font-semibold mt-1">Tap the photo to change it</Text>
      </View>

      {/* personal details */}
      <Section icon="person-outline" title="Personal details">
        <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />
        <View className="gap-2">
          <LockedRow icon="mail-outline" label="Email" value={user?.email} />
          <LockedRow icon="call-outline" label="Mobile" value={user?.phone} />
          <Text className={T.small}>Email and mobile are your sign-in details and can't be changed.</Text>
        </View>
        <View>
          <Text className="font-bold text-ink mb-1.5">Gender</Text>
          <View className="flex-row gap-3">
            {(['male', 'female'] as const).map((g) => {
              const on = gender === g;
              return (
                <Pressable key={g} onPress={() => setGender(g)} accessibilityRole="button" accessibilityLabel={g} accessibilityState={{ selected: on }} className={cn('flex-1 flex-row items-center justify-center gap-2 h-[50px] rounded-2xl border-[1.5px]', on ? 'border-primary bg-primary-soft' : 'border-line bg-white')}>
                  <Ionicons name={g === 'male' ? 'male' : 'female'} size={19} color={on ? colors.primary : colors.muted} />
                  <Text className={cn('text-[14px] font-bold', on ? 'text-primary' : 'text-muted')}>{g === 'male' ? 'Male' : 'Female'}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Section>

      {/* address */}
      <Section icon="location-outline" title="Address">
        {!infoLoaded ? <FormSkeleton fields={3} /> : (
          <>
            <LocationPicker label="Location" value={f.formattedAddress || f.location} onChange={pickPlace} />
            <Field label="Door / Flat No" value={f.doorNo} onChangeText={(v) => setF((x) => ({ ...x, doorNo: v }))} placeholder="Enter Door / Flat No" />
            {!!f.location && (
              <View className="rounded-2xl bg-cream border border-line p-3.5 gap-2.5">
                <View className="flex-row items-center gap-1.5"><Ionicons name="lock-closed" size={12} color={colors.muted} /><Text className="text-xs text-muted flex-1">Filled in from your location. Search again to change.</Text></View>
                <Text className="text-[14px] font-semibold text-ink leading-5">{f.address}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {[f.city, f.district, f.state, f.country, f.pincode].filter(Boolean).map((v, i) => (
                    <View key={`${v}-${i}`} className="bg-white border border-line rounded-full px-3 py-1"><Text className="text-xs font-semibold text-ink">{v}</Text></View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </Section>

      {/* language (applies immediately) */}
      <View className="bg-white rounded-3xl border border-orange-100 overflow-hidden">
        <Pressable onPress={() => setLangOpen((o) => !o)} accessibilityRole="button" accessibilityLabel="Language" accessibilityState={{ expanded: langOpen }} className="flex-row items-center gap-2.5 p-4 active:bg-cream">
          <View className="w-8 h-8 rounded-xl bg-blue-soft items-center justify-center"><Ionicons name="language-outline" size={17} color={colors.blue} /></View>
          <Text className="flex-1 text-[16px] font-extrabold text-ink">Language</Text>
          <Text noTranslate className="text-[13px] font-semibold text-muted">{language.label}</Text>
          <Ionicons name={langOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
        </Pressable>
        {langOpen && <View className="px-4 pb-4 border-t border-line pt-3"><LanguageSection /></View>}
      </View>

      <Button disabled={saving || deleting} title={saving ? 'Saving…' : 'Save Changes'} icon={<Ionicons name="checkmark-circle-outline" size={19} color="#fff" />} onPress={save} />

      {/* danger zone */}
      <Section icon="warning-outline" title="Delete account" tone="red">
        <Text className={T.body}>Permanently remove your account and all of its data, including your pets, appointments and records. This can't be undone.</Text>
        <Pressable onPress={deleteAccount} disabled={deleting || saving} accessibilityRole="button" accessibilityLabel="Delete my account" className={cn('flex-row items-center justify-center gap-2 rounded-2xl py-3.5 border border-red/30 bg-red-soft active:opacity-80', (deleting || saving) && 'opacity-50')}>
          <Ionicons name="trash-outline" size={18} color={colors.red} />
          <Text className="text-red font-extrabold text-[15px]">{deleting ? 'Deleting…' : 'Delete my account'}</Text>
        </Pressable>
      </Section>
    </View>
  );
}