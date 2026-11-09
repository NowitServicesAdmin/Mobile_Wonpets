import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { colors } from '../../theme';
import { Button, Field, T, cn } from '../ui';
import { WonPetsAlert } from '../WonPetsAlert';
import { FormCard, LockedRow } from './ProfileBits';
import { errorMessage } from '../../services/api';
import { authService } from '../../services/auth.service';
import { useAuth } from '../../context/AuthContext';
import { useDoctor } from '../../context/DoctorContext';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Edit your own account: photo, name, gender - and add the e-mail / mobile you signed up without (once, like the web). */
export default function DoctorProfileForm() {
  const { user, updateProfile, signOut } = useAuth();
  const { refreshProfile } = useDoctor();
  const [name, setName] = useState(user?.name ?? '');
  const [gender, setGender] = useState<'male' | 'female'>(user?.gender === 'male' ? 'male' : 'female');
  const [photo, setPhoto] = useState<string | undefined>(user?.profileImage);
  const [newPhoto, setNewPhoto] = useState<string | undefined>();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // a saved e-mail / mobile is locked for good; the missing one can be added once
  const emailLocked = !!user?.email;
  const phoneLocked = !!user?.phone;
  useEffect(() => { if (!newPhoto) setPhoto(user?.profileImage); }, [user?.profileImage, newPhoto]);

  const pick = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!r.canceled) { setPhoto(r.assets[0].uri); setNewPhoto(r.assets[0].uri); }
  };

  const save = async () => {
    if (!name.trim()) return WonPetsAlert.error('Name required', 'Please enter your name.');
    let addEmail: string | undefined;
    let addPhone: string | undefined;
    if (!emailLocked && email.trim()) {
      if (!EMAIL.test(email.trim())) return WonPetsAlert.warning('Invalid email', 'Please enter a valid email address.');
      addEmail = email.trim().toLowerCase();
    }
    if (!phoneLocked && phone.trim()) {
      const p = parsePhoneNumberFromString(phone.trim(), 'IN'); // 10-digit numbers are read as Indian, anything else needs its +code
      if (!p?.isValid()) return WonPetsAlert.warning('Invalid mobile number', 'Please enter a valid mobile number (add the country code if it is not an Indian number).');
      addPhone = p.number;
    }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), gender, imageUri: newPhoto, email: addEmail, phone: addPhone });
      setNewPhoto(undefined); setEmail(''); setPhone('');
      refreshProfile(); // the header / hero pick up the new name + photo
      WonPetsAlert.success('Profile Updated', 'Your profile has been updated successfully.');
    } catch (e) {
      WonPetsAlert.error('Could not update profile', errorMessage(e));
    } finally { setSaving(false); }
  };

  const deleteAccount = async () => {
    const r = await WonPetsAlert.delete('Delete your account?', 'This permanently deletes your account, schedule and records. This cannot be undone.', { confirmText: 'Delete account' });
    if (!r.isConfirmed) return;
    setDeleting(true);
    try { await authService.deleteAccount(); await signOut(); }
    catch (e) { setDeleting(false); WonPetsAlert.error('Could not delete account', errorMessage(e)); }
  };

  return (
    <View className="gap-3.5">
      {/* hero: photo + who you are */}
      <View className="items-center bg-white rounded-3xl border border-orange-100 pt-5 pb-4 px-4 gap-1">
        <Pressable onPress={pick} accessibilityRole="button" accessibilityLabel="Change profile photo">
          <View className="rounded-full p-0.5 bg-orange-300">
            <View className="w-[104px] h-[104px] rounded-full bg-primary-soft border-2 border-white items-center justify-center overflow-hidden">
              {photo ? <Image source={{ uri: photo }} className="w-full h-full" /> : <Text className="text-[50px]">🩺</Text>}
            </View>
          </View>
          <View className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-primary items-center justify-center border-[3px] border-white"><Ionicons name="camera" size={16} color="#fff" /></View>
        </Pressable>
        <Text numberOfLines={1} className="text-[19px] font-black text-ink mt-2">{user?.name ? (user.role !== 'doctor' || /^dr\.?\s/i.test(user.name) ? user.name : `Dr. ${user.name}`) : 'Your name'}</Text>
        <Text numberOfLines={1} className="text-[13px] text-muted">{user?.email || user?.phone}</Text>
        <Text className="text-[12px] text-primary font-semibold mt-1">Tap the photo to change it</Text>
      </View>

      <FormCard icon="person-outline" title="Personal details">
        <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" />

        <View className="gap-2">
          {emailLocked
            ? <LockedRow icon="mail-outline" label="Email" value={user?.email} />
            : <Field label="Email" value={email} onChangeText={setEmail} placeholder="Add your email address" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} hint="You can add your email once. After you save, it can't be changed." />}
          {phoneLocked
            ? <LockedRow icon="call-outline" label="Mobile" value={user?.phone} />
            : <Field label="Mobile" value={phone} onChangeText={setPhone} placeholder="e.g. 98765 43210 or +44 7700 900123" keyboardType="phone-pad" hint="You can add your mobile number once. After you save, it can't be changed." />}
          {emailLocked && phoneLocked && <Text className={T.small}>Email and mobile are your sign-in details and can't be changed.</Text>}
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
      </FormCard>

      <Button disabled={saving || deleting} title={saving ? 'Saving…' : 'Save Changes'} icon={<Ionicons name="checkmark-circle-outline" size={19} color="#fff" />} onPress={save} />

      <FormCard icon="warning-outline" title="Delete account" tone="red">
        <Text className={T.body}>Permanently remove your account and all of its data, including your schedule, prescriptions and records. This can't be undone.</Text>
        <Pressable onPress={deleteAccount} disabled={deleting || saving} accessibilityRole="button" accessibilityLabel="Delete my account" className={cn('flex-row items-center justify-center gap-2 rounded-2xl py-3.5 border border-red/30 bg-red-soft active:opacity-80', (deleting || saving) && 'opacity-50')}>
          <Ionicons name="trash-outline" size={18} color={colors.red} />
          <Text className="text-red font-extrabold text-[15px]">{deleting ? 'Deleting…' : 'Delete my account'}</Text>
        </Pressable>
      </FormCard>
    </View>
  );
}
