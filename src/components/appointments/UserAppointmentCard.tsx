import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { cn } from '../ui';
import PetAvatar from '../PetAvatar';
import { Appointment } from '../../data/mock';
import { MODE_ICON, StatusPill, apptDateParts } from './AppointmentCard';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function apptDate(a: Appointment): Date | null {
  const p = apptDateParts(a);
  const m = MONTHS.indexOf(p.mon);
  if (m < 0) return null;
  return new Date(Number(p.year), m, Number(p.day));
}

/** "Today", "Tomorrow", otherwise "Thu, Nov 20" (year added only when it isn't this year). */
export function relativeDateLabel(a: Appointment): { text: string; soon: boolean } {
  const d = apptDate(a);
  if (!d || isNaN(d.getTime())) return { text: a.date, soon: false };
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff = Math.round((d.getTime() - start) / 86400000);
  if (diff === 0) return { text: 'Today', soon: true };
  if (diff === 1) return { text: 'Tomorrow', soon: true };
  const text = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', ...(d.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}) });
  return { text, soon: false };
}

/**
 * Compact appointment row for the pet owner: pet photo, name + status, "doctor • visit type",
 * "date · time · mode". The next appointment is highlighted and carries a full-width Join button;
 * other joinable visits get a small Join pill, completed visits with a prescription get a small
 * prescription button. About 76px tall, so many more fit on screen.
 */
export default function UserAppointmentCard({ item, highlight = false, onOpen, onJoin, onPrescription }: {
  item: Appointment; highlight?: boolean; onOpen: () => void; onJoin?: () => void; onPrescription?: () => void;
}) {
  const when = relativeDateLabel(item);
  const emergency = item.mode === 'Emergency';
  const sub = `${item.doctor ?? 'Doctor to be assigned'}${item.visitType ? ` • ${item.visitType}` : ''}`;
  const bigJoin = highlight && !!onJoin;

  return (
    <View className={cn('rounded-2xl border overflow-hidden shadow-sm shadow-orange-900/10', highlight ? 'bg-primary-soft border-orange-200' : 'bg-white border-line')}>
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${item.pet}, ${item.status} appointment, ${when.text} at ${item.time}. View details`}
        className="flex-row items-center gap-2.5 p-2.5 active:opacity-80">
        <PetAvatar emoji={item.emoji} image={item.petImage} size={46} />
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-[15px] font-extrabold text-ink flex-shrink" numberOfLines={1}>{item.pet}</Text>
            <StatusPill status={item.status} />
          </View>
          <Text className="text-[12px] text-muted" numberOfLines={1}>{sub}</Text>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="time-outline" size={13} color={colors.primary} />
            <Text className={cn('text-[12.5px] font-bold', when.soon ? 'text-primary' : 'text-ink')} numberOfLines={1}>{when.text} · {item.time}</Text>
            <Ionicons name={MODE_ICON[item.mode] ?? 'medical-outline'} size={13} color={emergency ? colors.red : colors.muted} />
            <Text className={cn('text-[12px] flex-shrink', emergency ? 'text-red font-bold' : 'text-muted')} numberOfLines={1}>{item.mode}</Text>
          </View>
        </View>
        {onJoin && !bigJoin ? (
          <Pressable onPress={onJoin} hitSlop={6} accessibilityRole="button" accessibilityLabel="Join video consultation" className="flex-row items-center gap-1 bg-primary rounded-full px-3 py-2 active:opacity-80">
            <Ionicons name="videocam" size={14} color="#fff" />
            <Text className="text-white text-[12px] font-extrabold">Join</Text>
          </Pressable>
        ) : onPrescription ? (
          <Pressable onPress={onPrescription} hitSlop={6} accessibilityRole="button" accessibilityLabel="View prescription" className="w-9 h-9 rounded-full bg-primary-soft items-center justify-center active:opacity-80">
            <Ionicons name="document-text-outline" size={17} color={colors.primary} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-forward" size={16} color="#CDBFB0" />
        )}
      </Pressable>
      {bigJoin && (
        <Pressable onPress={onJoin} accessibilityRole="button" accessibilityLabel="Join consultation"
          className="mx-2.5 mb-2.5 flex-row items-center justify-center gap-2 bg-primary rounded-full py-2.5 active:opacity-90">
          <Ionicons name="videocam" size={17} color="#fff" />
          <Text className="text-white font-extrabold text-[14px]">Join Consultation</Text>
        </Pressable>
      )}
    </View>
  );
}