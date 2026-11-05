import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { cn } from '../ui';
import PetAvatar from '../PetAvatar';
import { Appointment } from '../../data/mock';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** One source of truth for status colours / icons across the appointment screens. */
export const STATUS_META: Record<string, { color: string; soft: string; icon: IconName }> = {
  Pending: { color: '#B7791F', soft: '#FEF3C7', icon: 'time-outline' },
  Confirmed: { color: '#2563EB', soft: '#DBEAFE', icon: 'checkmark-circle-outline' },
  'In Progress': { color: '#EA580C', soft: '#FFEDD5', icon: 'pulse' },
  Completed: { color: '#16A34A', soft: '#DCFCE7', icon: 'checkmark-done' },
  Cancelled: { color: '#DC2626', soft: '#FEE2E2', icon: 'close-circle-outline' },
};
export const MODE_ICON: Record<string, IconName> = {
  'Clinic Visit': 'location-outline', Online: 'videocam-outline', 'Home Care': 'home-outline', Emergency: 'alert-circle-outline',
};

export function StatusPill({ status, size = 'sm' }: { status: string; size?: 'sm' | 'md' }) {
  const m = STATUS_META[status] ?? STATUS_META.Pending;
  return (
    <View style={{ backgroundColor: m.soft }} className={cn('flex-row items-center gap-1 rounded-full self-start', size === 'md' ? 'px-3 py-1.5' : 'px-2.5 py-1')}>
      <Ionicons name={m.icon} size={size === 'md' ? 14 : 12} color={m.color} />
      <Text style={{ color: m.color }} className={cn('font-bold', size === 'md' ? 'text-[13px]' : 'text-[11px]')}>{status}</Text>
    </View>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Day / month / year / weekday of an appointment (ISO date when we have it, else "dd/MM" + current year). */
export function apptDateParts(a: Appointment) {
  let y = '', m = '', d = '';
  if (a.isoDate && /^\d{4}-\d{2}-\d{2}/.test(a.isoDate)) [y, m, d] = a.isoDate.slice(0, 10).split('-');
  else { [d = '', m = ''] = a.date.split('/'); y = String(new Date().getFullYear()); }
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return {
    day: String(Number(d) || ''), mon: MONTHS[Number(m) - 1] ?? '', year: y,
    wd: isNaN(dt.getTime()) ? '' : dt.toLocaleDateString('en-US', { weekday: 'short' }),
  };
}

/** "16 Oct 2026" */
export function formatApptDate(a: Appointment) {
  const p = apptDateParts(a);
  return p.mon ? `${p.day} ${p.mon} ${p.year}` : a.date;
}

/** Calendar-leaf style date tile, tinted by status. */
export function DateTile({ a, size = 60 }: { a: Appointment; size?: number }) {
  const p = apptDateParts(a);
  const m = STATUS_META[a.status] ?? STATUS_META.Pending;
  return (
    <View style={{ width: size, height: size + 6, backgroundColor: m.soft }} className="rounded-2xl items-center justify-center">
      <Text style={{ color: m.color }} className="text-[10px] font-extrabold uppercase tracking-wider">{p.wd || p.mon}</Text>
      <Text className="text-[24px] font-black text-ink leading-[26px]">{p.day}</Text>
      <Text style={{ color: m.color }} className="text-[10px] font-extrabold uppercase">{p.mon}</Text>
    </View>
  );
}

function Action({ label, icon, onPress, solid }: { label: string; icon: IconName; onPress: () => void; solid?: boolean }) {
  return (
    <Pressable onPress={onPress} className={cn('flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl active:opacity-80', solid ? 'bg-primary' : 'bg-primary-soft')}>
      <Ionicons name={icon} size={15} color={solid ? '#fff' : colors.primary} />
      <Text className={cn('text-[13px] font-bold', solid ? 'text-white' : 'text-primary')}>{label}</Text>
    </Pressable>
  );
}

/**
 * Appointment row: status-tinted date tile, pet + status pill, time / visit type / doctor.
 * The whole card opens the details screen; quick actions (join / prescription / reschedule) sit underneath when they apply.
 */
export default function AppointmentCard({ item, onOpen, onJoin, onPrescription, onReschedule }: {
  item: Appointment; onOpen: () => void; onJoin?: () => void; onPrescription?: () => void; onReschedule?: () => void;
}) {
  const hasActions = !!(onJoin || onPrescription || onReschedule);
  const m = STATUS_META[item.status] ?? STATUS_META.Pending;
  return (
    <View className="bg-white rounded-3xl border border-line overflow-hidden shadow-sm shadow-orange-900/10">
      <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${item.pet}, ${item.status} appointment. View details`} className="flex-row gap-3.5 p-3.5 active:bg-cream">
        <DateTile a={item} />
        <View className="flex-1 gap-1">
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-row items-center gap-2 flex-1">
              <PetAvatar emoji={item.emoji} image={item.petImage} size={26} />
              <Text className="text-[16px] font-extrabold text-ink flex-shrink" numberOfLines={1}>{item.pet}</Text>
            </View>
            <StatusPill status={item.status} />
          </View>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="time-outline" size={14} color={colors.primary} />
            <Text className="text-[13px] font-bold text-ink">{item.time}</Text>
            <Text className="text-muted">·</Text>
            <Ionicons name={MODE_ICON[item.mode] ?? 'medical-outline'} size={14} color={item.mode === 'Emergency' ? colors.red : colors.muted} />
            <Text className={cn('text-[13px] flex-shrink', item.mode === 'Emergency' ? 'text-red font-bold' : 'text-muted')} numberOfLines={1}>{item.mode}</Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="text-[13px] text-muted flex-1" numberOfLines={1}>{item.doctor ?? 'Doctor to be assigned'}{item.visitType ? ` · ${item.visitType}` : ''}</Text>
            <Ionicons name="chevron-forward" size={18} color="#CDBFB0" />
          </View>
        </View>
      </Pressable>
      {hasActions && (
        <View style={{ backgroundColor: m.soft + '55' }} className="flex-row gap-2 px-3.5 py-3 border-t border-orange-100">
          {!!onJoin && <Action solid label="Join now" icon="videocam" onPress={onJoin} />}
          {!!onPrescription && <Action label="Prescription" icon="document-text-outline" onPress={onPrescription} />}
          {!!onReschedule && <Action label="Reschedule" icon="calendar-outline" onPress={onReschedule} />}
        </View>
      )}
    </View>
  );
}