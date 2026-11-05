import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Chip, Field, T } from '../ui';
import { toast } from '../WonPetsAlert';
import type { Address, AddressType } from '../../data/mock';
import { PlaceDetails, Prediction, locationService } from '../../services/location.service';
import { errorMessage } from '../../services/api';
import { getCurrentCoords } from '../../utils/location';

type Form = Omit<Address, 'id'>;
const empty: Form = { fullName: '', phone: '', doorNo: '', area: '', landmark: '', addressType: 'Home', isDefault: false };
const types: AddressType[] = ['Home', 'Work', 'Other'];

/** Add / edit address bottom sheet. The area is picked with the same Google place lookup the web uses (the server needs city, state, pincode and coordinates). */
export default function AddressSheet({ visible, address, onClose, onSave }: {
  visible: boolean; address?: Address | null; onClose: () => void;
  /** resolves to a truthy value when the address was saved */
  onSave: (a: Form & { id?: string }) => Promise<unknown> | unknown;
}) {
  const [form, setForm] = useState<Form>(empty);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Prediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (!visible) return;
    setForm(address ? { ...address } : empty);
    setQuery(address?.formattedAddress ?? address?.area ?? '');
    setHits([]);
  }, [visible, address]);

  // autocomplete (the server needs at least 3 characters)
  useEffect(() => {
    const q = query.trim();
    if (!visible || q.length < 3 || q === form.formattedAddress) { setHits([]); return; }
    let live = true;
    const t = setTimeout(async () => {
      setSearching(true);
      try { const r = await locationService.search(q); if (live) setHits(r.slice(0, 5)); } catch { if (live) setHits([]); }
      finally { if (live) setSearching(false); }
    }, 450);
    return () => { live = false; clearTimeout(t); };
  }, [query, visible]);

  const applyPlace = (d: PlaceDetails) => {
    set({
      placeId: d.placeId, formattedAddress: d.address, latitude: d.latitude, longitude: d.longitude,
      area: [d.area, d.city, [d.state, d.pincode].filter(Boolean).join(' ')].filter(Boolean).join(', ') || d.address,
      city: d.city, district: d.district, state: d.state, country: d.country || 'India', pincode: d.pincode,
    });
    setQuery(d.address);
    setHits([]);
  };
  const pick = async (h: Prediction) => {
    try { applyPlace(await locationService.details(h.place_id)); } catch (e) { toast.error(errorMessage(e)); }
  };
  const useCurrent = async () => {
    setSearching(true);
    try {
      const c = await getCurrentCoords();
      if (!c) return toast.error('Location permission is needed to use your current location.');
      applyPlace(await locationService.reverse(c.lat, c.lng));
    } catch (e) { toast.error(errorMessage(e)); }
    finally { setSearching(false); }
  };

  const submit = async () => {
    if (!form.fullName.trim() || !form.phone.trim() || !form.doorNo.trim()) return toast.error('Please fill all required fields.');
    if (!form.latitude || !form.longitude || !form.city || !form.state || !form.pincode) return toast.error('Search and select your area so we can locate it (it needs a city, state and pincode).');
    if (saving) return;
    setSaving(true);
    try {
      const saved = await onSave({ ...form, id: address?.id });
      if (!saved) return; // the context already showed the error
      toast.success(address ? 'Address updated successfully.' : 'Address added successfully.');
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-[28px] max-h-[90%]">
          <View className="flex-row justify-between items-center px-5 pt-5 pb-2">
            <Text className={T.h2}>{address ? 'Edit address' : 'Add new address'}</Text>
            <Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></Pressable>
          </View>
          <ScrollView contentContainerClassName="px-5 pb-6 gap-3.5" keyboardShouldPersistTaps="handled">
            <Field label="Full name *" value={form.fullName} onChangeText={(v) => set({ fullName: v })} placeholder="Who receives the order?" />
            <Field label="Phone *" keyboardType="phone-pad" value={form.phone} onChangeText={(v) => set({ phone: v })} placeholder="+91 98765 43210" />
            <Field label="Door no. / Building *" value={form.doorNo} onChangeText={(v) => set({ doorNo: v })} placeholder="12/4, Lake View Apartments" />
            <View>
              <Field label="Area / locality *" value={query} onChangeText={(v) => { setQuery(v); if (form.formattedAddress && v !== form.formattedAddress) set({ formattedAddress: undefined, latitude: undefined, longitude: undefined }); }} placeholder="Search your area, street or landmark" />
              <View className="flex-row items-center justify-between mt-1.5">
                <Pressable onPress={useCurrent} className="flex-row items-center gap-1"><Ionicons name="locate" size={15} color={colors.primary} /><Text className="text-primary font-bold text-xs">Use my current location</Text></Pressable>
                {searching && <ActivityIndicator size="small" color={colors.primary} />}
              </View>
              {hits.map((h) => (
                <Pressable key={h.place_id} onPress={() => pick(h)} className="flex-row items-center gap-2 py-2.5 border-b border-line">
                  <Ionicons name="location-outline" size={16} color={colors.muted} /><Text className="flex-1 text-sm text-ink">{h.description}</Text>
                </Pressable>
              ))}
              {!!form.latitude && !!form.pincode && <Text className={T.small + ' mt-1.5'}>📍 {form.city}, {form.state} {form.pincode}</Text>}
            </View>
            <Field label="Landmark" value={form.landmark} onChangeText={(v) => set({ landmark: v })} placeholder="Optional" />
            <View>
              <Text className="font-bold text-ink mb-1.5">Address type</Text>
              <View className="flex-row gap-2">{types.map((t) => <Chip key={t} label={t} active={form.addressType === t} onPress={() => set({ addressType: t })} />)}</View>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold text-ink">Make this my default address</Text>
              <Switch value={form.isDefault} onValueChange={(v) => set({ isDefault: v })} trackColor={{ true: colors.primary }} />
            </View>
            <Button title={saving ? 'Saving…' : address ? 'Save changes' : 'Save address'} disabled={saving} onPress={submit} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
