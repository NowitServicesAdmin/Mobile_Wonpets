import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { T, cn } from '../ui';
import { appointmentsService, Slot } from '../../services/appointments.service';
import { to12h } from '../../services/mappers';

const pad = (n: number) => String(n).padStart(2, '0');
export const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Appointment dates in the app are "dd/MM". */
export const ddmm = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
/** "09:00 am" -> "9:00 am" (the style used by existing appointments). */
export const niceTime = (t: string) => to12h(t);

export type DayOpt = { key: string; dow: string; day: number; month: string; date: Date };
export const buildDays = (count = 14): DayOpt[] =>
  Array.from({ length: count }, (_, i) => {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i);
    return { key: isoLocal(d), dow: d.toLocaleDateString('en-IN', { weekday: 'short' }), day: d.getDate(), month: d.toLocaleDateString('en-IN', { month: 'short' }), date: d };
  });
export const DAYS = buildDays();

type Props = {
  day: string; slot: string | null; onDay: (key: string) => void; onSlot: (s: string | null) => void;
  /** Doctor whose real availability is loaded from the API. The selected slot is "HH:mm" (24h). */
  doctorId?: string;
};

const PARTS: { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; test: (h: number) => boolean }[] = [
  { label: 'Morning', icon: 'sunny-outline', test: (h) => h < 12 },
  { label: 'Afternoon', icon: 'partly-sunny-outline', test: (h) => h >= 12 && h < 17 },
  { label: 'Evening', icon: 'moon-outline', test: (h) => h >= 17 },
];

/** Scrollable date strip + time slots grouped into morning / afternoon / evening. Booked slots, breaks and past times come back disabled from the server. */
export default function SlotPicker({ day, slot, onDay, onSlot, doctorId }: Props) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const strip = useRef<ScrollView>(null);
  const sel = DAYS.find((d) => d.key === day) ?? DAYS[0];

  useEffect(() => {
    if (!doctorId) { setSlots([]); return; }
    let live = true;
    setLoading(true); setNote('');
    appointmentsService.slots(doctorId, day).then(
      (r) => { if (!live) return; setSlots(r.slots.filter((x) => !x.isBreak)); setNote(r.slots.length ? '' : r.message || 'No slots available on this day'); },
      (e) => { if (live) { setSlots([]); setNote(e.message); } },
    ).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [doctorId, day]);

  const groups = useMemo(() => PARTS.map((p) => ({ ...p, items: slots.filter((s) => p.test(parseInt(s.time.slice(0, 2), 10))) })).filter((g) => g.items.length), [slots]);
  const free = slots.filter((s) => s.available).length;

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className={T.h3}>{sel.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        {!!doctorId && !loading && !note && <Text className="text-xs font-bold text-green">{free} slot{free === 1 ? '' : 's'} free</Text>}
      </View>

      <ScrollView ref={strip} horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-2">
        {DAYS.map((d, i) => {
          const on = d.key === day;
          return (
            <Pressable key={d.key} onPress={() => { onDay(d.key); onSlot(null); }} className={cn('w-[58px] py-3 rounded-2xl items-center border-[1.5px]', on ? 'bg-primary border-primary' : 'bg-white border-line')}>
              <Text className={cn('text-[11px] font-bold uppercase', on ? 'text-white/90' : 'text-muted')}>{i === 0 ? 'Today' : d.dow}</Text>
              <Text className={cn('text-[20px] font-black mt-0.5', on ? 'text-white' : 'text-ink')}>{d.day}</Text>
              <Text className={cn('text-[10px] font-semibold', on ? 'text-white/80' : 'text-muted')}>{d.month}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {!doctorId ? <Text className={T.body + ' text-center py-3'}>Choose a doctor to see available times.</Text>
        : loading ? <ActivityIndicator color={colors.primary} />
        : note ? (
          <View className="items-center bg-cream rounded-2xl py-6 gap-1"><Ionicons name="calendar-clear-outline" size={28} color="#D8C7B5" /><Text className={T.body + ' text-center'}>{note}</Text></View>
        ) : (
          <View className="gap-3.5">
            {groups.map((g) => (
              <View key={g.label} className="gap-2">
                <View className="flex-row items-center gap-1.5"><Ionicons name={g.icon} size={14} color={colors.muted} /><Text className="text-xs font-extrabold text-muted uppercase tracking-wider">{g.label}</Text></View>
                <View className="flex-row flex-wrap gap-2">
                  {g.items.map(({ time, booked, available }) => {
                    const on = slot === time;
                    return (
                      <Pressable key={time} disabled={!available} onPress={() => onSlot(time)} className={cn('w-[31.5%] py-2.5 rounded-xl items-center border-[1.5px]', on ? 'bg-primary border-primary' : !available ? 'bg-gray-100 border-gray-100' : 'bg-white border-line active:bg-primary-soft')}>
                        <Text className={cn('font-bold text-[13px]', on ? 'text-white' : !available ? 'text-gray-400 line-through' : 'text-ink')}>{to12h(time)}</Text>
                        {booked && <Text className="text-[9px] text-gray-400">Booked</Text>}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
    </View>
  );
}