import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, T } from '../ui';
import PetAvatar from '../PetAvatar';
import BottomSheet from '../common/BottomSheet';
import SlotPicker, { DAYS, niceTime } from './SlotPicker';
import { toast } from '../WonPetsAlert';
import type { Appointment } from '../../data/mock';

/**
 * Pick a new date + time for an existing appointment.
 * Owners reschedule against the doctor's slots; a doctor reschedules against their own (same `doctorId`), with their own wording.
 */
export default function RescheduleSheet({
  visible, appointment, onClose, onConfirm, viewer = 'owner',
}: {
  visible: boolean; appointment: Appointment; onClose: () => void;
  /** time is "HH:mm"; resolve true when the server accepted it */
  onConfirm: (patch: { isoDate: string; time: string }) => Promise<boolean>;
  viewer?: 'owner' | 'doctor';
}) {
  const [busy, setBusy] = useState(false);
  const [day, setDay] = useState(DAYS[0].key);
  const [slot, setSlot] = useState<string | null>(null);
  useEffect(() => { if (visible) { setDay(DAYS[0].key); setSlot(null); } }, [visible]);
  const dayObj = DAYS.find((d) => d.key === day)!;
  const isDoctor = viewer === 'doctor';

  const confirm = async () => {
    if (!slot) return toast.error('Please choose a new time.');
    if (busy) return;
    setBusy(true);
    const ok = await onConfirm({ isoDate: day, time: slot });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <BottomSheet
      visible={visible} onClose={onClose} title="Reschedule" subtitle="Pick a new date and time"
      footer={
        <>
          {!!slot && <Text className="text-center text-[13px] font-bold text-ink mb-2.5">New time: {dayObj.dow}, {dayObj.day} {dayObj.month} · {niceTime(slot)}</Text>}
          <Button title={busy ? (isDoctor ? 'Saving…' : 'Requesting…') : (isDoctor ? 'Move appointment' : 'Request new time')} disabled={busy || !slot} onPress={confirm} />
        </>
      }
    >
      <View className="flex-row items-center gap-3 bg-white rounded-2xl border border-line p-3">
        <PetAvatar emoji={appointment.emoji} image={appointment.petImage} size={44} />
        <View className="flex-1">
          <Text className={T.h3} numberOfLines={1}>{appointment.pet} · {isDoctor ? (appointment.owner ?? 'Pet owner') : (appointment.doctor ?? 'Doctor')}</Text>
          <Text className={T.small}>Currently {appointment.date} at {appointment.time}</Text>
        </View>
      </View>
      <View className="bg-white rounded-2xl border border-line p-4">
        <SlotPicker day={day} slot={slot} onDay={setDay} onSlot={setSlot} doctorId={appointment.doctorId ?? undefined} />
      </View>
      <View className="flex-row items-start gap-2">
        <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
        <Text className={T.small + ' flex-1'}>{isDoctor ? 'The pet owner is notified about the new time.' : 'Your vet will need to confirm the new time again.'}</Text>
      </View>
    </BottomSheet>
  );
}
