import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Empty, Tone, T } from '../../components/ui';
import UserAppointmentCard from '../../components/appointments/UserAppointmentCard';
import AppointmentCalendar from '../../components/appointments/AppointmentCalendar';
import RescheduleSheet from '../../components/appointments/RescheduleSheet';
import SearchBar from '../../components/common/SearchBar';
import SegmentedTabs from '../../components/common/SegmentedTabs';
import { toast } from '../../components/WonPetsAlert';
import { Appointment } from '../../data/mock';
import { usePets } from '../../context/PetsContext';
import { timeToMinutes } from '../../utils/schedule';
import { usePagedReveal } from '../../hooks/usePagedReveal';
import { UserAppointmentListSkeleton } from '../../components/Skeletons';

const PAGE_SIZE = 6; // appointments revealed per batch (a skeleton shows while the next 6 load)

export const statusTone: Record<string, Tone> = { Pending: 'yellow', Confirmed: 'blue', 'In Progress': 'orange', Completed: 'green', Cancelled: 'red' };

type Tab = 'upcoming' | 'past' | 'cancelled';
const OPEN: Appointment['status'][] = ['Pending', 'Confirmed', 'In Progress'];
const inTab = (a: Appointment, t: Tab) => (t === 'upcoming' ? OPEN.includes(a.status) : t === 'past' ? a.status === 'Completed' : a.status === 'Cancelled');

/** Appointment dates are "dd/MM" (no year); new bookings also carry an ISO date. */
const sortKey = (a: Appointment) => {
  const [dd = '01', mm = '01'] = a.date.split('/');
  return (a.isoDate ?? `${new Date().getFullYear()}-${mm}-${dd}`) + String(timeToMinutes(a.time)).padStart(4, '0');
};
const isJoinable = (a: Appointment) => a.mode === 'Online' && (a.status === 'Confirmed' || a.status === 'In Progress');

/** List | Calendar switch as two icon buttons. */
function ViewToggle({ view, onChange }: { view: 'list' | 'calendar'; onChange: (v: 'list' | 'calendar') => void }) {
  return (
    <View className="flex-row bg-orange-100/60 rounded-xl p-0.5">
      {([['list', 'list-outline', 'List view'], ['calendar', 'calendar-outline', 'Calendar view']] as const).map(([k, icon, label]) => {
        const on = view === k;
        return (
          <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label}
            style={on ? { backgroundColor: '#fff', elevation: 2, shadowColor: '#7C2D12', shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } } : undefined}
            className="w-9 h-8 rounded-[10px] items-center justify-center">
            <Ionicons name={icon} size={17} color={on ? colors.primary : colors.muted} />
          </Pressable>
        );
      })}
    </View>
  );
}

const EMPTY: Record<Tab, { emoji: string; title: string; body: string }> = {
  upcoming: { emoji: '🩺', title: 'No upcoming visits', body: 'Book a vet visit and it will show up here.' },
  past: { emoji: '🗓️', title: 'No past visits yet', body: 'Completed appointments will appear here.' },
  cancelled: { emoji: '✅', title: 'No cancelled visits', body: 'Nothing has been cancelled.' },
};

export default function AppointmentsScreen({ navigation }: any) {
  const { appointments, rescheduleAppointment, refreshAppointments, loaded } = usePets();
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [tab, setTab] = useState<Tab>('upcoming');
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [resched, setResched] = useState<Appointment | null>(null);

  const counts = useMemo(() => ({
    upcoming: appointments.filter((a) => inTab(a, 'upcoming')).length,
    past: appointments.filter((a) => inTab(a, 'past')).length,
    cancelled: appointments.filter((a) => inTab(a, 'cancelled')).length,
  }), [appointments]);

  // soonest first for upcoming visits, newest first for past / cancelled
  const list = useMemo(
    () => appointments
      .filter((a) => inTab(a, tab) && a.pet.toLowerCase().includes(q.trim().toLowerCase()))
      .sort((a, b) => (tab === 'upcoming' ? sortKey(a).localeCompare(sortKey(b)) : sortKey(b).localeCompare(sortKey(a)))),
    [appointments, tab, q]
  );
  // 6 at a time; while the next 6 "load" a skeleton is shown at the end of the list
  const { items, hasMore, loadingMore, loadMore, total } = usePagedReveal(list, PAGE_SIZE, `${tab}|${q}`);

  // the soonest open appointment (today or later); highlighted on the Upcoming tab
  const next = useMemo(() => {
    const open = appointments.filter((a) => inTab(a, 'upcoming')).sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
    const d = new Date(); const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return open.find((a) => sortKey(a).slice(0, 10) >= t) ?? open[0];
  }, [appointments]);
  const reschedulable = useMemo(() => (next && (next.status === 'Pending' || next.status === 'Confirmed') ? next : appointments.find((a) => a.status === 'Pending' || a.status === 'Confirmed')), [next, appointments]);

  const join = (a: Appointment) => navigation.navigate('VideoCall', { id: a.id });
  const open = (a: Appointment) => navigation.navigate('AppointmentDetail', { id: a.id });
  const toggleSearch = () => { if (showSearch) setQ(''); setShowSearch((v) => !v); };

  const footer = () => {
    if (view !== 'list' || !loaded) return null;
    if (loadingMore) return <View className="mt-2.5"><UserAppointmentListSkeleton count={3} /></View>;
    if (hasMore) return <View className="h-6" />;
    return (
      <View className="gap-2.5 mt-1">
        {total > 0 && <Text className={`${T.small} text-center`}>You've reached the end · {total} {total === 1 ? 'appointment' : 'appointments'}</Text>}
        {!!reschedulable && (
          <Pressable onPress={() => setResched(reschedulable)} accessibilityRole="button" accessibilityLabel="Reschedule an appointment"
            className="flex-row items-center gap-3 bg-orange-100/60 border border-orange-200 rounded-2xl px-3 py-2.5 active:opacity-80">
            <Ionicons name="calendar-outline" size={22} color={colors.primary} />
            <View className="flex-1">
              <Text className="text-[13px] font-extrabold text-ink">Need to reschedule?</Text>
              <Text className="text-[12px] text-muted" numberOfLines={1}>Change the time of {reschedulable.pet}'s next visit.</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-cream">
      <FlatList
        className="flex-1"
        contentContainerClassName="p-3.5 gap-2.5 pb-24"
        data={view === 'list' && loaded ? items : []}
        refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await refreshAppointments(); setRefreshing(false); }}
        keyExtractor={(a) => a.id}
        onEndReached={view === 'list' ? loadMore : undefined}
        onEndReachedThreshold={0.3}
        ListHeaderComponent={
          <View className="gap-2.5 mb-0.5">
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <Text className="text-[20px] font-black text-ink" numberOfLines={1}>My Appointments</Text>
                <Text className="text-[12px] text-muted" numberOfLines={1}>Track and manage your pet's appointments</Text>
              </View>
              {view === 'list' && (
                <Pressable onPress={toggleSearch} accessibilityRole="button" accessibilityLabel={showSearch ? 'Close search' : 'Search appointments'}
                  className="w-9 h-9 rounded-xl bg-orange-100/60 items-center justify-center active:opacity-80">
                  <Ionicons name={showSearch ? 'close' : 'search-outline'} size={18} color={colors.primary} />
                </Pressable>
              )}
              <ViewToggle view={view} onChange={setView} />
            </View>

            {view === 'list' && showSearch && <SearchBar value={q} onChangeText={setQ} placeholder="Search by pet name…" />}

            {view === 'list' && (
              <SegmentedTabs<Tab>
                value={tab}
                onChange={setTab}
                tabs={[
                  { key: 'upcoming', label: `Upcoming · ${counts.upcoming}`, icon: 'calendar-outline' },
                  { key: 'past', label: `Past · ${counts.past}`, icon: 'time-outline' },
                  { key: 'cancelled', label: `Cancelled · ${counts.cancelled}`, icon: 'close-circle-outline' },
                ]}
              />
            )}

            {view === 'calendar' && <AppointmentCalendar compact appointments={appointments} onOpen={open} />}
          </View>
        }
        ListEmptyComponent={
          !loaded ? <UserAppointmentListSkeleton count={PAGE_SIZE} />
            : view === 'list' ? <Empty emoji={EMPTY[tab].emoji} title={q ? 'No matches' : EMPTY[tab].title} body={q ? 'No appointment matches that pet name.' : EMPTY[tab].body} />
            : undefined
        }
        renderItem={({ item }) => (
          <UserAppointmentCard
            item={item}
            highlight={tab === 'upcoming' && item.id === next?.id}
            onOpen={() => open(item)}
            onJoin={isJoinable(item) ? () => join(item) : undefined}
            onPrescription={item.status === 'Completed' && item.hasPrescription ? () => navigation.navigate('Prescription', { appointmentId: item.id }) : undefined}
          />
        )}
        ListFooterComponent={footer}
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