import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty, Gradient, T, Tone, cn } from '../../components/ui';
import AppointmentCard, { DateTile, MODE_ICON, STATUS_META, formatApptDate } from '../../components/appointments/AppointmentCard';
import AppointmentCalendar from '../../components/appointments/AppointmentCalendar';
import RescheduleSheet from '../../components/appointments/RescheduleSheet';
import { toast } from '../../components/WonPetsAlert';
import { Appointment } from '../../data/mock';
import { usePets } from '../../context/PetsContext';
import { timeToMinutes } from '../../utils/schedule';
import LoadMoreFooter from '../../components/LoadMoreFooter';
import { AppointmentListSkeleton } from '../../components/Skeletons';

const PAGE_SIZE = 6; // appointments revealed per scroll batch

const statuses: Appointment['status'][] = ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];
export const statusTone: Record<string, Tone> = { Pending: 'yellow', Confirmed: 'blue', 'In Progress': 'orange', Completed: 'green', Cancelled: 'red' };

/** Appointment dates are "dd/MM" (no year); new bookings also carry an ISO date. */
const sortKey = (a: Appointment) => {
  const [dd = '01', mm = '01'] = a.date.split('/');
  return (a.isoDate ?? `${new Date().getFullYear()}-${mm}-${dd}`) + String(timeToMinutes(a.time)).padStart(4, '0');
};
const isJoinable = (a: Appointment) => a.mode === 'Online' && (a.status === 'Confirmed' || a.status === 'In Progress');

export default function AppointmentsScreen({ navigation }: any) {
  const { appointments, rescheduleAppointment, refreshAppointments, loaded } = usePets();
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState<string[]>([]);
  const [latestFirst, setLatestFirst] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [resched, setResched] = useState<Appointment | null>(null);
  const list = useMemo(
    () => appointments
      .filter((a) => (!active.length || active.includes(a.status)) && a.pet.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => (latestFirst ? sortKey(b).localeCompare(sortKey(a)) : sortKey(a).localeCompare(sortKey(b)))),
    [q, active, appointments, latestFirst]
  );
  // infinite scroll: the list is filtered / sorted above, then revealed PAGE_SIZE at a time as the user nears the end
  // (calendar view shows everything)
  const [shown, setShown] = useState(PAGE_SIZE);
  const pageItems = useMemo(() => list.slice(0, shown), [list, shown]);
  const hasMore = shown < list.length;
  useEffect(() => { setShown(PAGE_SIZE); }, [q, active, latestFirst]); // a new search / filter starts from the top again
  const loadMore = useCallback(() => { if (hasMore) setShown((n) => Math.min(n + PAGE_SIZE, list.length)); }, [hasMore, list.length]);
  const count = (s: string) => appointments.filter((a) => a.status === s).length;
  const stats: [string, number, string, React.ComponentProps<typeof Ionicons>['name']][] = [
    ['Upcoming', count('Confirmed') + count('In Progress') + count('Pending'), colors.primary, 'calendar'],
    ['Completed', count('Completed'), colors.green, 'checkmark-done'],
    ['Cancelled', count('Cancelled'), colors.red, 'close-circle'],
    ['Total', appointments.length, '#64748B', 'layers'],
  ];
  // the soonest open appointment (today or later); falls back to the earliest open one
  const next = useMemo(() => {
    const open = appointments.filter((a) => a.status === 'Pending' || a.status === 'Confirmed' || a.status === 'In Progress').sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    const today = new Date(); const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return open.find((a) => sortKey(a).slice(0, 10) >= t) ?? open[0];
  }, [appointments]);
  const filtered = !!q || active.length > 0 || !latestFirst;
  const join = (a: Appointment) => navigation.navigate('VideoCall', { id: a.id });

  return (
    <View className="flex-1 bg-cream">
      <FlatList
        className="flex-1"
        contentContainerClassName="p-4 gap-3 pb-28"
        data={view === 'list' && loaded ? pageItems : []}
        refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await refreshAppointments(); setRefreshing(false); }}
        keyExtractor={(a) => a.id}
        onEndReached={view === 'list' ? loadMore : undefined}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View className="gap-4 mb-1">
            <View>
              <Text className="text-primary font-extrabold text-xs uppercase tracking-widest">WONPET Health Center</Text>
              <Text className="text-[28px] font-black text-ink">Appointments</Text>
            </View>

            {/* next up hero */}
            {loaded && (next ? (
              <Gradient className="rounded-3xl p-4 overflow-hidden" colorsArr={['#FF6B00', '#F59E0B']}>
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-1.5 bg-white/25 rounded-full px-2.5 py-1"><Ionicons name="flash" size={12} color="#fff" /><Text className="text-white text-[11px] font-extrabold uppercase tracking-wider">Next up</Text></View>
                  <View className="flex-row items-center gap-1"><Ionicons name={MODE_ICON[next.mode] ?? 'medical-outline'} size={14} color="#fff" /><Text className="text-white text-xs font-bold">{next.mode}</Text></View>
                </View>
                <Pressable onPress={() => navigation.navigate('AppointmentDetail', { id: next.id })} className="flex-row items-center gap-3.5 active:opacity-90">
                  <View className="bg-white rounded-2xl"><DateTile a={next} size={58} /></View>
                  <View className="flex-1">
                    <Text className="text-white text-xl font-black" numberOfLines={1}>{next.pet}</Text>
                    <Text className="text-white/95 font-semibold" numberOfLines={1}>{formatApptDate(next)} · {next.time}</Text>
                    <Text className="text-white/85 text-xs mt-0.5" numberOfLines={1}>{next.doctor ?? 'Doctor to be assigned'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#fff" />
                </Pressable>
                {isJoinable(next) && (
                  <Pressable onPress={() => join(next)} className="mt-3.5 bg-white rounded-xl py-2.5 flex-row items-center justify-center gap-1.5 active:opacity-90">
                    <Ionicons name="videocam" size={16} color={colors.primary} /><Text className="text-primary font-extrabold">Join video consult</Text>
                  </Pressable>
                )}
              </Gradient>
            ) : (
              <View className="bg-white border border-line rounded-3xl p-4 flex-row items-center gap-3">
                <View className="w-12 h-12 rounded-2xl bg-primary-soft items-center justify-center"><Ionicons name="calendar-outline" size={24} color={colors.primary} /></View>
                <View className="flex-1"><Text className={T.h3}>No upcoming visits</Text><Text className={T.small}>Book a vet visit and it will show up here.</Text></View>
              </View>
            ))}

            {/* stats */}
            <View className="flex-row gap-2">
              {stats.map(([label, n, c, icon]) => (
                <View key={label} className="flex-1 bg-white border border-line rounded-2xl py-2.5 items-center">
                  <Ionicons name={icon} size={15} color={c} />
                  <Text className="text-[20px] font-black text-ink leading-6">{n}</Text>
                  <Text className="text-[10px] font-semibold text-muted">{label}</Text>
                </View>
              ))}
            </View>

            {/* search + sort */}
            <View className="flex-row gap-2">
              <View className="flex-1 flex-row items-center gap-2 bg-white border border-line rounded-2xl px-3">
                <Ionicons name="search-outline" size={18} color={colors.muted} />
                <TextInput value={q} onChangeText={setQ} placeholder="Search by pet name…" placeholderTextColor="#B8AEA5" className="flex-1 py-3 text-ink" />
                {!!q && <Pressable onPress={() => setQ('')} hitSlop={8}><Ionicons name="close-circle" size={18} color="#CDBFB0" /></Pressable>}
              </View>
              <Pressable onPress={() => setLatestFirst((v) => !v)} accessibilityLabel={latestFirst ? 'Sorted latest first' : 'Sorted oldest first'} className="w-12 rounded-2xl bg-white border border-line items-center justify-center active:bg-primary-soft">
                <Ionicons name={latestFirst ? 'arrow-down' : 'arrow-up'} size={18} color={colors.primary} />
              </Pressable>
            </View>

            {/* list / calendar */}
<View className="flex-row bg-orange-100/60 rounded-2xl p-1">
  {([['list', 'list-outline', 'List'], ['calendar', 'calendar-outline', 'Calendar']] as const).map(([k, icon, label]) => {
    const on = view === k;
    return (
      <Pressable
        key={k}
        onPress={() => setView(k)}
        style={on ? { backgroundColor: '#fff', elevation: 2, shadowColor: '#7C2D12', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } } : undefined}
        className="flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-xl"
      >
        <Ionicons name={icon} size={16} color={on ? colors.primary : colors.muted} />
        <Text style={{ color: on ? colors.primary : colors.muted }} className="font-bold">{label}</Text>
      </Pressable>
    );
  })}
</View>

            {/* status filters */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-4">
              <Pressable onPress={() => setActive([])} className={cn('px-3.5 py-2 rounded-full border', !active.length ? 'bg-ink border-ink' : 'bg-white border-line')}>
                <Text className={cn('font-bold text-[13px]', !active.length ? 'text-white' : 'text-ink')}>All · {appointments.length}</Text>
              </Pressable>
              {statuses.map((st) => {
                const on = active.includes(st); const m = STATUS_META[st];
                return (
                  <Pressable key={st} onPress={() => setActive((a) => (a.includes(st) ? a.filter((x) => x !== st) : [...a, st]))}
                    style={on ? { backgroundColor: m.soft, borderColor: m.color } : undefined}
                    className={cn('flex-row items-center gap-1.5 px-3 py-2 rounded-full border', !on && 'bg-white border-line')}>
                    <View style={{ backgroundColor: m.color }} className="w-2 h-2 rounded-full" />
                    <Text style={on ? { color: m.color } : undefined} className={cn('font-bold text-[13px]', !on && 'text-ink')}>{st} · {count(st)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View className="flex-row justify-between items-center">
              <Text className={T.small}>{view === 'list' ? `${list.length} appointment${list.length === 1 ? '' : 's'}` : 'Tap a day to see its visits'}</Text>
              {filtered && <Pressable onPress={() => { setActive([]); setQ(''); setLatestFirst(true); }}><Text className="text-primary font-bold text-[13px]">Reset filters</Text></Pressable>}
            </View>
            {view === 'calendar' && <AppointmentCalendar appointments={list} onOpen={(a) => navigation.navigate('AppointmentDetail', { id: a.id })} />}
          </View>
        }
        ListEmptyComponent={!loaded ? <AppointmentListSkeleton /> : view === 'list' ? <Empty emoji="🩺" title="No appointments" body={appointments.length ? 'Nothing matches these filters.' : 'Book your first visit to see it here.'} /> : undefined}
        renderItem={({ item }) => (
          <AppointmentCard
            item={item}
            onOpen={() => navigation.navigate('AppointmentDetail', { id: item.id })}
            onJoin={isJoinable(item) ? () => join(item) : undefined}
            onPrescription={item.status === 'Completed' && item.hasPrescription ? () => navigation.navigate('Prescription', { appointmentId: item.id }) : undefined}
            onReschedule={item.status === 'Pending' || item.status === 'Confirmed' ? () => setResched(item) : undefined}
          />
        )}
        ListFooterComponent={view === 'list' && loaded ? <LoadMoreFooter hasMore={hasMore} total={list.length} noun="appointments" /> : undefined}
      />

      <Pressable onPress={() => navigation.navigate('BookAppointment')} accessibilityRole="button" accessibilityLabel="Book appointment"
        className="absolute bottom-5 right-4 flex-row items-center gap-2 bg-primary rounded-full pl-4 pr-5 py-3.5 shadow-lg shadow-orange-900/30 active:opacity-90">
        <Ionicons name="add-circle" size={22} color="#fff" /><Text className="text-white font-extrabold text-[15px]">Book</Text>
      </Pressable>

      {resched && (
        <RescheduleSheet visible appointment={resched} onClose={() => setResched(null)}
          onConfirm={async (patch) => { const ok = await rescheduleAppointment(resched.id, patch); if (ok) toast.success('Reschedule requested — your vet will confirm the new time'); return ok; }} />
      )}
    </View>
  );
}