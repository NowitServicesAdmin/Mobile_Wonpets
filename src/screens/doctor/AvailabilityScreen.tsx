import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Card, Field, T, cn } from '../../components/ui';
import CustomDropdown from '../../components/CustomDropdown';
import { FormSkeleton } from '../../components/Skeletons';
import { toast } from '../../components/WonPetsAlert';
import { DoctorSchedule, doctorService } from '../../services/doctor.service';
import { errorMessage } from '../../services/api';
import { to12h } from '../../services/mappers';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 48 }, (_, i) => { const v = `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`; return { value: v, label: to12h(v) }; });
const MODES: { key: keyof DoctorSchedule['capabilities']; label: string; hint: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'clinicVisit', label: 'Clinic visits', hint: 'Owners come to your clinic', icon: 'location-outline' },
  { key: 'online', label: 'Online consultations', hint: 'Video calls', icon: 'videocam-outline' },
  { key: 'homeCare', label: 'Home care', hint: 'You visit the pet at home', icon: 'home-outline' },
];

/** Working hours, days, fee and the kinds of visits the doctor takes. Breaks and holidays are kept as they are (edit those on the web). */
export default function AvailabilityScreen({ navigation }: any) {
  const [s, setS] = useState<DoctorSchedule | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { doctorService.schedule().then(setS).catch((e) => toast.error(errorMessage(e))); }, []);
  if (!s) return <FormSkeleton fields={4} />;
  const set = (p: Partial<DoctorSchedule>) => setS({ ...s, ...p });
  const toggleDay = (d: number) => set({ workingDays: s.workingDays.includes(d) ? s.workingDays.filter((x) => x !== d) : [...s.workingDays, d].sort() });

  const save = async () => {
    if (s.startTime >= s.endTime) return toast.error('Closing time must be after opening time.');
    if (!s.workingDays.length) return toast.error('Pick at least one working day.');
    if (!Object.values(s.capabilities).some(Boolean)) return toast.error('Turn on at least one kind of visit.');
    setSaving(true);
    try { await doctorService.saveSchedule(s); toast.success('Availability saved'); navigation.goBack(); }
    catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
  };

  return (
    <ScrollView className="flex-1 bg-cream" keyboardShouldPersistTaps="handled" contentContainerClassName="p-4 gap-3.5 pb-10">
      <Card className="gap-3.5">
        <Text className={T.h2}>Working hours</Text>
        <View className="flex-row gap-3">
          <View className="flex-1 gap-1.5"><Text className="font-bold text-ink">Opens</Text><CustomDropdown title="Opening time" searchable={false} value={s.startTime} options={HOURS} onChange={(v) => set({ startTime: v })} /></View>
          <View className="flex-1 gap-1.5"><Text className="font-bold text-ink">Closes</Text><CustomDropdown title="Closing time" searchable={false} value={s.endTime} options={HOURS} onChange={(v) => set({ endTime: v })} /></View>
        </View>
        <Text className="font-bold text-ink">Working days</Text>
        <View className="flex-row gap-1.5">
          {DAY_LABELS.map((l, d) => { const on = s.workingDays.includes(d); return (
            <Pressable key={l} onPress={() => toggleDay(d)} accessibilityRole="button" accessibilityState={{ selected: on }} className={cn('flex-1 py-3 rounded-xl items-center border-[1.5px]', on ? 'bg-primary border-primary' : 'bg-white border-line')}>
              <Text className={cn('text-[12px] font-bold', on ? 'text-white' : 'text-muted')}>{l}</Text>
            </Pressable>); })}
        </View>
        <Text className={T.small}>{s.slotDuration}-minute slots{s.breaks.length ? ` · ${s.breaks.map((b) => `${b.name || 'Break'} ${to12h(b.startTime)}–${to12h(b.endTime)}`).join(', ')}` : ''}</Text>
      </Card>

      <Card className="gap-3.5">
        <Text className={T.h2}>Consultation fee</Text>
        <Field value={s.fee ? String(s.fee) : ''} onChangeText={(t) => set({ fee: Number(t.replace(/[^\d]/g, '')) || 0 })} keyboardType="numeric" placeholder="e.g. 500" hint="Shown to pet owners when they book." />
      </Card>

      <Card className="gap-1 py-2">
        <Text className={T.h2 + ' mb-1'}>Kinds of visits</Text>
        {MODES.map((m) => (
          <View key={m.key} className="flex-row items-center gap-3 py-2.5">
            <View className="w-10 h-10 rounded-xl bg-primary-soft items-center justify-center"><Ionicons name={m.icon} size={19} color={colors.primary} /></View>
            <View className="flex-1"><Text className="text-[15px] font-bold text-ink">{m.label}</Text><Text className={T.small}>{m.hint}</Text></View>
            <Switch value={s.capabilities[m.key]} onValueChange={(v) => set({ capabilities: { ...s.capabilities, [m.key]: v } })} trackColor={{ true: colors.primary, false: '#E5D8C9' }} thumbColor="#fff" />
          </View>
        ))}
      </Card>

      <Button title={saving ? 'Saving…' : 'Save availability'} disabled={saving} onPress={save} />
    </ScrollView>
  );
}
