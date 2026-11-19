import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty, Gradient, T, Tone, cn } from '../../components/ui';
import AppointmentCard, { DateTile, MODE_ICON, STATUS_META, formatApptDate } from '../../components/appointments/AppointmentCard';
import AppointmentCalendar from '../../components/appointments/AppointmentCalendar';
import RescheduleSheet from '../../components/appointments/RescheduleSheet';
import SearchBar from '../../components/common/SearchBar';
import FilterChips from '../../components/common/FilterChips';
import { PageHeader } from '../../components/doctor/DoctorUI';
import { toast } from '../../components/WonPetsAlert';
import { Appointment } from '../../data/mock';
import { usePets } from '../../context/PetsContext';
import { timeToMinutes } from '../../utils/schedule';
import LoadMoreFooter from '../../components/LoadMoreFooter';
import { AppointmentListSkeleton } from '../../components/Skeletons';

const PAGE_SIZE = 8; // appointments revealed per scroll batch

const statuses: Appointment['status'][] = ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled'];
export const statusTone: Record<string, Tone> = { Pending: 'yellow', Confirmed: 'blue', 'In Progress': 'orange', Completed: 'green', Cancelled: 'red' };

/** Appointment dates are "dd/MM" (no year); new bookings also carry an ISO date. */
const sortKey = (a: Appointment) => {
  const [dd = '01', mm = '01'] = a.date.split('/');
  return (a.isoDate ?? `${new Date().getFullYear()}-${mm}-${dd}`) + String(timeToMinutes(a.time)).padStart(4, '0');
};
const isJoinable = (a: Appointment) => a.mode === 'Online' && (a.status === 'Confirmed' || a.status === 'In Progress');

/** List | Calendar switch as two icon buttons (lives in the page header, so it no longer needs its own row). */
function ViewToggle({ view, onChange }: { view: 'list' | 'calendar'; onChange: (v: 'list' | 'calendar') => void }) {
  return (
    <View className="flex-row bg-orange-100/60 rounded-xl p-0.5">
      {([['list', 'list-outline', 'List view'], ['calendar', 'calendar-outline', 'Calendar view']] as const).map(([k, icon, label]) => {
        const on = view === k;
        return (
          <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label}
            style={on ? { backgroundColor: '#fff', elevation: 2, shadowColor: '#7C2D12', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } } : undefined}
            className="w-10 h-9 rounded-[10px] items-center justify-center">
            <Ionicons name={icon} size={18} color={on ? colors.primary : colors.muted} />
          </Pressable>
        );
      })}
    </View>
  );
}

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
  const resetFilters = () => { setActive([]); setQ(''); setLatestFirst(true); };

  return (
    <View className="flex-1 bg-cream">
      <FlatList
        className="flex-1"
        contentContainerClassName="p-3.5 gap-2.5 pb-24"
        data={view === 'list' && loaded ? pageItems : []}
        refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await refreshAppointments(); setRefreshing(false); }}
        keyExtractor={(a) => a.id}
        onEndReached={view === 'list' ? loadMore : undefined}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View className="gap-2.5 mb-0.5">
            <PageHeader icon="calendar" title="Appointments" subtitle="WONPET Health Center" right={<ViewToggle view={view} onChange={setView} />} />

            {/* next up: one slim row; the video-consult button is a round icon instead of a full-width bar */}
            {loaded && (next ? (
              <Gradient className="rounded-3xl p-3 overflow-hidden" colorsArr={['#FF6B00', '#F59E0B']}>
                <Pressable onPress={() => navigation.navigate('AppointmentDetail', { id: next.id })} accessibilityRole="button" accessibilityLabel={`Next appointment: ${next.pet}, ${formatApptDate(next)} at ${next.time}`} className="flex-row items-center gap-3 active:opacity-90">
                  <View className="bg-white rounded-2xl"><DateTile a={next} size={50} /></View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="flash" size={11} color="#fff" />
                      <Text className="text-white text-[10px] font-extrabold uppercase tracking-wider">Next up</Text>
                      <Text className="text-white/70 text-[10px]">•</Text>
                      <Ionicons name={MODE_ICON[next.mode] ?? 'medical-outline'} size={12} color="#fff" />
                      <Text className="text-white text-[11px] font-bold" numberOfLines={1}>{next.mode}</Text>
                    </View>
                    <Text className="text-white text-[18px] font-black leading-6" numberOfLines={1}>{next.pet}</Text>
                    <Text className="text-white/95 text-[12.5px] font-semibold" numberOfLines={1}>{formatApptDate(next)} · {next.time}</Text>
                    <Text className="text-white/85 text-[11px]" numberOfLines={1}>{next.doctor ?? 'Doctor to be assigned'}</Text>
                  </View>
                  {isJoinable(next)
                    ? <Pressable hitSlop={6} onPress={() => join(next)} accessibilityRole="button" accessibilityLabel="Join video consult" className="w-11 h-11 rounded-full bg-white items-center justify-center active:opacity-90"><Ionicons name="videocam" size={20} color={colors.primary} /></Pressable>
                    : <Ionicons name="chevron-forward" size={20} color="#fff" />}
                </Pressable>
              </Gradient>
            ) : (
              <View className="bg-white border border-line rounded-3xl p-3 flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-2xl bg-primary-soft items-center justify-center"><Ionicons name="calendar-outline" size={20} color={colors.primary} /></View>
                <View className="flex-1"><Text className={T.h3}>No upcoming visits</Text><Text className={T.small}>Book a vet visit and it will show up here.</Text></View>
              </View>
            ))}

            {/* stats: one strip with dividers instead of four separate tiles */}
            <View className="flex-row bg-white border border-line rounded-2xl py-2">
              {stats.map(([label, n, c, icon], i) => (
                <View key={label} className={cn('flex-1 items-center', i > 0 && 'border-l border-line')}>
                  <View className="flex-row items-center gap-1">
                    <Ionicons name={icon} size={13} color={c} />
                    <Text maxFontSizeMultiplier={1.1} className="text-[17px] font-black text-ink leading-6">{n}</Text>
                  </View>
                  <Text maxFontSizeMultiplier={1.1} className="text-[10px] font-semibold text-muted" numberOfLines={1}>{label}</Text>
                </View>
              ))}
            </View>

            {/* search + sort in one row, status chips (with counts) in the next */}
            <SearchBar value={q} onChangeText={setQ} placeholder="Search by pet name…"
              trailing={{ icon: latestFirst ? 'arrow-down' : 'arrow-up', label: latestFirst ? 'Sorted latest first' : 'Sorted oldest first', onPress: () => setLatestFirst((v) => !v) }} />
            <FilterChips allCount={appointments.length} active={active} onChange={setActive}
              options={statuses.map((s) => ({ key: s, label: s, count: count(s), color: STATUS_META[s].color, soft: STATUS_META[s].soft }))} />

            {/* only shown while something is filtered; otherwise the chips already say how many there are */}
            {filtered && view === 'list' && (
              <View className="flex-row justify-between items-center">
                <Text className={T.small}>{list.length} appointment{list.length === 1 ? '' : 's'}</Text>
                <Pressable onPress={resetFilters} accessibilityRole="button"><Text className="text-primary font-bold text-[13px]">Reset filters</Text></Pressable>
              </View>
            )}
            {view === 'calendar' && <AppointmentCalendar compact appointments={appointments} onOpen={(a) => navigation.navigate('AppointmentDetail', { id: a.id })} />}
          </View>
        }
        ListEmptyComponent={!loaded ? <AppointmentListSkeleton /> : view === 'list' ? <Empty emoji="🩺" title="No appointments" body={appointments.length ? 'Nothing matches these filters.' : 'Book your first visit to see it here.'} /> : undefined}
        renderItem={({ item }) => (
          <AppointmentCard
            compact
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