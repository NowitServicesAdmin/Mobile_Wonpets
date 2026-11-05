import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Appointment } from '../../data/mock';
import { Card, T, cn } from '../ui';
import PetAvatar from '../PetAvatar';
import { Avatar } from '../Avatar';
import { StatusPill } from './AppointmentCard';

/** Same status colours as the web calendar. */
export const STATUS_COLOR: Record<string, string> = {
  Pending: '#EAB308', Confirmed: '#3B82F6', 'In Progress': '#F97316', Completed: '#22C55E', Cancelled: '#EF4444',
};
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const pad = (n: number) => String(n).padStart(2, '0');
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Appointments carry "dd/MM" (no year); bookings from the API also have an ISO date. */
export const isoOf = (a: Appointment) => {
  if (a.isoDate) return a.isoDate.slice(0, 10);
  const [dd = '01', mm = '01'] = a.date.split('/');
  return `${new Date().getFullYear()}-${mm}-${dd}`;
};

export default function AppointmentCalendar({ appointments, onOpen }: { appointments: Appointment[]; onOpen: (a: Appointment) => void }) {
  const today = new Date();
  const todayKey = keyOf(today);
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string>(todayKey);

  const byDate = useMemo(() => {
    const m: Record<string, Appointment[]> = {};
    appointments.forEach((a) => { (m[isoOf(a)] = m[isoOf(a)] || []).push(a); });
    Object.values(m).forEach((l) => l.sort((x, y) => (x.time24 ?? '').localeCompare(y.time24 ?? '')));
    return m;
  }, [appointments]);

  const first = month.getDay();
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const isThisMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  const dayList = byDate[selected] ?? [];
  const monthCount = Object.keys(byDate).filter((k) => k.startsWith(`${month.getFullYear()}-${pad(month.getMonth() + 1)}`)).reduce((n, k) => n + byDate[k].length, 0);

  return (
    <View className="gap-3.5">
      <Card>
        <View className="flex-row items-center justify-between mb-3">
          <Pressable onPress={() => shift(-1)} hitSlop={8} className="w-9 h-9 rounded-xl border border-orange-200 bg-white items-center justify-center"><Ionicons name="chevron-back" size={18} color={colors.text} /></Pressable>
          <View className="items-center">
            <Text className="text-base font-extrabold text-ink">{month.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</Text>
            {!isThisMonth
              ? <Pressable onPress={() => { setMonth(new Date(today.getFullYear(), today.getMonth(), 1)); setSelected(todayKey); }}><Text className="text-xs font-bold text-primary mt-0.5">Jump to today</Text></Pressable>
              : <Text className={T.small}>{monthCount} appointment{monthCount === 1 ? '' : 's'} this month</Text>}
          </View>
          <Pressable onPress={() => shift(1)} hitSlop={8} className="w-9 h-9 rounded-xl border border-orange-200 bg-white items-center justify-center"><Ionicons name="chevron-forward" size={18} color={colors.text} /></Pressable>
        </View>

        <View className="flex-row mb-1">{WEEKDAYS.map((d, i) => <Text key={i} className="flex-1 text-center text-[11px] font-bold text-muted py-1">{d}</Text>)}</View>
        <View className="flex-row flex-wrap">
          {cells.map((d, i) => {
            if (!d) return <View key={`e${i}`} style={{ width: '14.2857%', height: 50 }} />;
            const key = `${month.getFullYear()}-${pad(month.getMonth() + 1)}-${pad(d)}`;
            const list = byDate[key] ?? [];
            const isToday = key === todayKey;
            const isSel = key === selected;
            const statuses = [...new Set(list.map((a) => a.status))].slice(0, 3);
            return (
              <View key={key} style={{ width: '14.2857%', height: 50 }} className="items-center justify-center">
                <Pressable onPress={() => setSelected(key)}
  className={cn('w-[40px] h-[44px] rounded-full items-center justify-center', isSel ? 'bg-primary' : isToday ? 'bg-primary-soft border border-primary' : list.length ? 'bg-cream' : '')}>
  <Text className={cn('text-[14px] font-bold', isSel ? 'text-white' : isToday ? 'text-primary' : 'text-ink')}>{d}</Text>
  {!!statuses.length && (
    <View className="flex-row gap-0.5 mt-0.5">
      {statuses.map((s) => <View key={s} style={{ backgroundColor: isSel ? '#fff' : STATUS_COLOR[s] ?? '#94A3B8' }} className="w-1.5 h-1.5 rounded-full" />)}
    </View>
  )}
  {list.length > 1 && !isSel && <View className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full items-center justify-center bg-primary"><Text className="text-[9px] font-extrabold text-white">{list.length}</Text></View>}
</Pressable>
              </View>
            );
          })}
        </View>

        <View className="flex-row flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-orange-100">
          {Object.entries(STATUS_COLOR).map(([s, c]) => <View key={s} className="flex-row items-center gap-1"><View style={{ backgroundColor: c }} className="w-2 h-2 rounded-full" /><Text className="text-[11px] text-muted">{s}</Text></View>)}
        </View>
      </Card>

      <Text className={T.h3}>{selected === todayKey ? 'Today' : new Date(selected + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</Text>
      {!dayList.length && (
        <View className="items-center bg-white rounded-2xl border border-line py-7 gap-1"><Ionicons name="calendar-clear-outline" size={30} color="#D8C7B5" /><Text className={T.small}>No appointments on this day</Text></View>
      )}
      {dayList.map((a) => (
  <Pressable key={a.id} onPress={() => onOpen(a)} className="flex-row items-center gap-3 bg-white rounded-2xl border border-line p-3 active:bg-cream" style={{ borderLeftWidth: 4, borderLeftColor: STATUS_COLOR[a.status] ?? '#94A3B8' }}>
    <PetAvatar emoji={a.emoji} image={a.petImage} size={46} />
    <View className="flex-1 gap-1">
      <View className="flex-row items-center justify-between"><Text className={T.h3} numberOfLines={1}>{a.pet}</Text><Text className="text-xs font-extrabold text-primary">{a.time}</Text></View>
      <View className="flex-row items-center gap-1.5"><Avatar image={a.doctorImage} emoji="🩺" size={18} /><Text className={cn(T.small, 'flex-1')} numberOfLines={1}>{a.doctor ?? 'Doctor'} · {a.mode}</Text></View>
      <StatusPill status={a.status} />
    </View>
    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
  </Pressable>
))}
    </View>
  );
}
