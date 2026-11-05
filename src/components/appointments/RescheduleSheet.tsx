import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, T } from '../ui';
import PetAvatar from '../PetAvatar';
import SlotPicker, { DAYS, niceTime } from './SlotPicker';
import { toast } from '../WonPetsAlert';
import type { Appointment } from '../../data/mock';

/** Pick a new date + time for an existing appointment. */
export default function RescheduleSheet({ visible, appointment, onClose, onConfirm }: {
  visible: boolean; appointment: Appointment; onClose: () => void;
  /** time is "HH:mm"; resolve true when the server accepted it */
  onConfirm: (patch: { isoDate: string; time: string }) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [day, setDay] = useState(DAYS[0].key);
  const [slot, setSlot] = useState<string | null>(null);
  useEffect(() => { if (visible) { setDay(DAYS[0].key); setSlot(null); } }, [visible]);
  const dayObj = DAYS.find((d) => d.key === day)!;

  const confirm = async () => {
    if (!slot) return toast.error('Please choose a new time.');
    if (busy) return;
    setBusy(true);
    const ok = await onConfirm({ isoDate: day, time: slot });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-cream rounded-t-[28px] max-h-[90%]">
          <View className="items-center pt-2.5"><View className="w-10 h-1.5 rounded-full bg-orange-200" /></View>
          <View className="flex-row justify-between items-center px-5 pt-3 pb-3">
            <View><Text className={T.h2}>Reschedule</Text><Text className={T.small}>Pick a new date and time</Text></View>
            <Pressable onPress={onClose} className="w-9 h-9 rounded-full bg-white border border-line items-center justify-center"><Ionicons name="close" size={20} color={colors.text} /></Pressable>
          </View>
          <ScrollView contentContainerClassName="px-5 pb-4 gap-4">
            <View className="flex-row items-center gap-3 bg-white rounded-2xl border border-line p-3">
              <PetAvatar emoji={appointment.emoji} image={appointment.petImage} size={44} />
              <View className="flex-1">
                <Text className={T.h3} numberOfLines={1}>{appointment.pet} · {appointment.doctor ?? 'Doctor'}</Text>
                <Text className={T.small}>Currently {appointment.date} at {appointment.time}</Text>
              </View>
            </View>
            <View className="bg-white rounded-2xl border border-line p-4">
              <SlotPicker day={day} slot={slot} onDay={setDay} onSlot={setSlot} doctorId={appointment.doctorId} />
            </View>
            <View className="flex-row items-start gap-2"><Ionicons name="information-circle-outline" size={16} color={colors.muted} /><Text className={T.small + ' flex-1'}>Your vet will need to confirm the new time again.</Text></View>
          </ScrollView>
          <View className="px-5 pt-3 pb-7 bg-white border-t border-line">
            {!!slot && <Text className="text-center text-[13px] font-bold text-ink mb-2.5">New time: {dayObj.dow}, {dayObj.day} {dayObj.month} · {niceTime(slot)}</Text>}
            <Button title={busy ? 'Requesting…' : 'Request new time'} disabled={busy || !slot} onPress={confirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}