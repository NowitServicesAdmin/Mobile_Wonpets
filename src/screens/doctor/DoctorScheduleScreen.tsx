import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Empty, T, cn } from '../../components/ui';
import AppointmentCard, { STATUS_META } from '../../components/appointments/AppointmentCard';
import AppointmentCalendar from '../../components/appointments/AppointmentCalendar';
import RescheduleSheet from '../../components/appointments/RescheduleSheet';
import DateStrip, { buildDays, isoLocal } from '../../components/common/DateStrip';
import SearchBar from '../../components/common/SearchBar';
import FilterChips from '../../components/common/FilterChips';
import SegmentedTabs from '../../components/common/SegmentedTabs';
import LoadMoreFooter from '../../components/LoadMoreFooter';
import { AppointmentListSkeleton } from '../../components/Skeletons';
import { toast } from '../../components/WonPetsAlert';
import { PageHeader, Panel, PanelHeader, TONES, DTone } from '../../components/doctor/DoctorUI';
import { useRemote } from '../../hooks/useRemote';
import { useInfiniteSlice } from '../../hooks/useInfiniteSlice';
import { useDoctorActions } from '../../hooks/useDoctorActions';
import { doctorService } from '../../services/doctor.service';
import { useDoctor } from '../../context/DoctorContext';
import { useAuth } from '../../context/AuthContext';
import type { Appointment } from '../../data/mock';
import { timeToMinutes } from '../../utils/schedule';

type Tab = 'day' | 'requests' | 'upcoming' | 'past';
const TABS: { key: Tab; label: string; icon: React.ComponentProps<typeof SegmentedTabs>['tabs'][number]['icon'] }[] = [
  { key: 'day', label: 'Day', icon: 'today-outline' }, { key: 'requests', label: 'Requests', icon: 'time-outline' },
  { key: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' }, { key: 'past', label: 'Past', icon: 'archive-outline' },
];
const sortKey = (a: Appointment) => (a.isoDate ?? '') + String(timeToMinutes(a.time)).padStart(4, '0');
const STATUSES = ['Pending', 'Confirmed', 'In Progress', 'Completed'];
const dayDiff = (iso: string) => Math.round((new Date(`${iso}T00:00:00`).getTime() - new Date(isoLocal(new Date()) + 'T00:00:00').getTime()) / 86400000);
const shiftDay = (iso: string, by: number) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + by); return isoLocal(d); };

/** The web's "Appointment Summary" panel: one tinted row per status for the picked day. */
function Summary({ all }: { all: Appointment[] }) {
  const n = (s: string) => all.filter((a) => a.status === s).length;
  const rows: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap; tone: DTone }[] = [
    { label: 'Total Appointments', value: all.length, icon: 'calendar', tone: 'blue' },
    { label: 'Completed', value: n('Completed'), icon: 'checkmark-circle', tone: 'green' },
    { label: 'Confirmed', value: n('Confirmed'), icon: 'checkmark-done-circle', tone: 'purple' },
    { label: 'In Progress', value: n('In Progress'), icon: 'sync-circle', tone: 'blue' },
    { label: 'Pending', value: n('Pending'), icon: 'time', tone: 'amber' },
  ];
  return (
    <Panel>
      <PanelHeader icon="bar-chart" title="Appointment Summary" />
      <View className="gap-1.5">
        {rows.map((r) => (
          <View key={r.label} className={cn('flex-row items-center justify-between rounded-xl px-3 py-2.5', TONES[r.tone].pale)}>
            <View className="flex-row items-center gap-2.5">
              <View className="w-7 h-7 rounded-lg bg-white items-center justify-center"><Ionicons name={r.icon} size={14} color={TONES[r.tone].fg} /></View>
              <Text className="text-[13px] font-semibold text-slate-800">{r.label}</Text>
            </View>
            <Text style={{ color: TONES[r.tone].fg }} className="text-base font-bold">{r.value}</Text>
          </View>
        ))}
      </View>
    </Panel>
  );
}

/** Doctor schedule - web layout: title block, date navigator, summary panel, then the appointment list (requests / upcoming / past tabs too). */
export default function DoctorScheduleScreen({ navigation, route }: any) {
  const { tick } = useDoctor();
  const { user } = useAuth();
  const todayKey = isoLocal(new Date());
  const [tab, setTab] = useState<Tab>(route.params?.tab ?? 'day');
  const [day, setDay] = useState(todayKey);
  const [q, setQ] = useState('');
  const [active, setActive] = useState<string[]>([]);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [resched, setResched] = useState<Appointment | null>(null);
  const days = useMemo(() => buildDays(21, dayDiff(day) - 3), [day]);

  // jumping here from Home (stat cards / "View All")
  React.useEffect(() => { if (route.params?.tab) { setTab(route.params.tab); setActive([]); navigation.setParams({ tab: undefined }); } }, [route.params?.tab]);

  const fetcher = async (): Promise<Appointment[]> => {
    switch (tab) {
      case 'day': return doctorService.day(day);
      case 'requests': return doctorService.pending();
      case 'upcoming': return doctorService.upcoming();
      default: { const [a, b] = await Promise.all([doctorService.completed(), doctorService.cancelled()]); return [...a, ...b]; }
    }
  };
  const rows = useRemote(fetcher, [tab, tab === 'day' ? day : ''], tick);
  const act = useDoctorActions(rows.reloadQuiet);

  const all = rows.data ?? [];
  const list = useMemo(() => all
    .filter((a) => (!active.length || active.includes(a.status)) && `${a.pet} ${a.owner ?? ''}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => (tab === 'past' ? sortKey(b).localeCompare(sortKey(a)) : sortKey(a).localeCompare(sortKey(b)))),
  [all, active, q, tab]);
  const page = useInfiniteSlice(list, 8, `${tab}|${day}|${q}|${active.join()}`);
  const count = (s: string) => all.filter((a) => a.status === s).length;

  const open = (a: Appointment) => navigation.navigate('DoctorAppointment', { id: a.id });
  const reschedule = async (patch: { isoDate: string; time: string }) => {
    if (!resched) return false;
    try { await doctorService.reschedule(resched.id, patch.isoDate, patch.time); toast.success('Appointment moved'); rows.reloadQuiet(); return true; }
    catch (e: any) { toast.error(e.message); return false; }
  };
  const showFilters = tab === 'day' || tab === 'past';
  const calendarOn = view === 'calendar' && tab !== 'day';
  const dayLabel = new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const NavBtn = ({ icon, label, onPress }: { icon: 'chevron-back' | 'chevron-forward'; label: string; onPress: () => void }) => (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className="w-10 h-10 rounded-xl bg-white border border-orange-200 items-center justify-center active:bg-orange-50">
      <Ionicons name={icon} size={16} color="#374151" />
    </Pressable>
  );

  return (
    <View className="flex-1 bg-cream">
      <FlatList
        className="flex-1" contentContainerClassName="p-4 gap-3 pb-10"
        data={calendarOn || rows.loading ? [] : page.items} keyExtractor={(a) => a.id}
        refreshing={rows.refreshing} onRefresh={rows.reload} onEndReached={calendarOn ? undefined : page.loadMore} onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View className="gap-3.5 mb-1">
            <PageHeader icon="calendar" title="Schedule" subtitle="Manage your appointments and daily schedule." />
            <SegmentedTabs tabs={TABS} value={tab} onChange={(t) => { setTab(t); setActive([]); setQ(''); }} />

            {tab === 'day' && (
              <>
                <View className="flex-row items-center gap-2">
                  <NavBtn icon="chevron-back" label="Previous day" onPress={() => setDay(shiftDay(day, -1))} />
                  <Pressable onPress={() => setDay(todayKey)} accessibilityRole="button" accessibilityLabel="Jump to today" className="flex-1 h-10 flex-row items-center justify-center gap-2 bg-white border border-orange-200 rounded-xl">
                    <Ionicons name="calendar" size={14} color="#F97316" />
                    <Text className="font-medium text-gray-700 text-[13px]">{dayLabel}</Text>
                    {day === todayKey && <View className="bg-orange-100 rounded-full px-2 py-0.5"><Text className="text-[10px] font-bold text-orange-600">Today</Text></View>}
                  </Pressable>
                  <NavBtn icon="chevron-forward" label="Next day" onPress={() => setDay(shiftDay(day, 1))} />
                </View>
                <DateStrip days={days} value={day} onChange={setDay} />
                {!rows.loading && <Summary all={all} />}
              </>
            )}

            <SearchBar value={q} onChangeText={setQ} placeholder="Search pet or owner…" />
            {showFilters && <FilterChips allCount={all.length} active={active} onChange={setActive}
              options={(tab === 'past' ? ['Completed', 'Cancelled'] : STATUSES).map((s) => ({ key: s, label: s, count: count(s), color: STATUS_META[s].color, soft: STATUS_META[s].soft }))} />}
            {(tab === 'upcoming' || tab === 'past') && <SegmentedTabs tabs={[{ key: 'list', label: 'List', icon: 'list-outline' }, { key: 'calendar', label: 'Calendar', icon: 'calendar-outline' }]} value={view} onChange={setView} />}
            <Text className={T.small}>{rows.loading ? 'Loading…' : calendarOn ? 'Tap a day to see its visits' : `${list.length} appointment${list.length === 1 ? '' : 's'}`}</Text>
            {calendarOn && <AppointmentCalendar viewer="doctor" appointments={list} onOpen={open} />}
            {!!rows.error && !rows.loading && <Text className="text-red text-sm">{rows.error}</Text>}
          </View>
        }
        ListEmptyComponent={rows.loading ? <AppointmentListSkeleton /> : calendarOn ? undefined : (
          <Empty emoji={tab === 'requests' ? '📭' : '🩺'} title={tab === 'requests' ? 'No requests' : 'No appointments'} body={all.length ? 'Nothing matches these filters.' : tab === 'requests' ? 'New booking requests will show up here.' : tab === 'day' ? 'Nothing is booked for this day.' : 'Nothing to show yet.'} />
        )}
        renderItem={({ item }) => (
          <AppointmentCard viewer="doctor" item={item} onOpen={() => open(item)} actions={act.actionsFor(item, { reschedule: setResched })} />
        )}
        ListFooterComponent={!calendarOn && !rows.loading ? <LoadMoreFooter hasMore={page.hasMore} total={page.total} noun="appointments" /> : undefined}
      />
      {resched && <RescheduleSheet visible viewer="doctor" appointment={{ ...resched, doctorId: user?.id }} onClose={() => setResched(null)} onConfirm={reschedule} />}
    </View>
  );
}
