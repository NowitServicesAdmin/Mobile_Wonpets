import React, { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Empty, T } from '../../components/ui';
import SearchBar from '../../components/common/SearchBar';
import FilterChips from '../../components/common/FilterChips';
import LoadMoreFooter from '../../components/LoadMoreFooter';
import { ChatListSkeleton } from '../../components/Skeletons';
import { DoctorRow, PageHeader, WebStatGrid, WebStatusBadge } from '../../components/doctor/DoctorUI';
import { useRemote } from '../../hooks/useRemote';
import { useInfiniteSlice } from '../../hooks/useInfiniteSlice';
import { doctorService } from '../../services/doctor.service';
import { useDoctor } from '../../context/DoctorContext';
import { formatIsoDate } from '../../utils/petAge';

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Follow-ups - the web page: Total / Today / Completed / Pending cards, then the pets asked to come back. */
export default function FollowUpsScreen({ navigation }: any) {
  const { tick } = useDoctor();
  const [q, setQ] = useState('');
  const [active, setActive] = useState<string[]>([]);
  const rows = useRemote(() => doctorService.followUps(), [], tick);
  const today = iso(new Date());
  const week = iso(new Date(Date.now() + 7 * 86400000));
  const bucket = (d: string) => (d < today ? 'overdue' : d === today ? 'today' : d <= week ? 'week' : 'later');

  const all = rows.data ?? [];
  const list = useMemo(() => all
    .filter((f) => `${f.pet} ${f.owner}`.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((f) => !active.length || active.includes(bucket(f.date)))
    .sort((a, b) => a.date.localeCompare(b.date)), [all, q, active]);
  const page = useInfiniteSlice(list, 10, `${q}|${active.join()}`);
  const n = (k: string) => all.filter((f) => bucket(f.date) === k).length;

  return (
    <FlatList className="flex-1 bg-cream" contentContainerClassName="p-4 gap-3 pb-10" data={rows.loading ? [] : page.items} keyExtractor={(f) => f.id}
      refreshing={rows.refreshing} onRefresh={rows.reload} onEndReached={page.loadMore} onEndReachedThreshold={0.4}
      ListHeaderComponent={
        <View className="gap-3.5 mb-1">
          <PageHeader icon="repeat" title="Follow Ups" subtitle="Pets you asked to come back." />
          <WebStatGrid stats={[
            { title: 'Total Follow Ups', value: all.length, icon: 'time', tone: 'orange' },
            { title: "Today's Follow Ups", value: n('today'), icon: 'calendar', tone: 'blue' },
            { title: 'Completed', value: all.filter((f) => f.status === 'Completed').length, icon: 'checkmark-circle', tone: 'green' },
            { title: 'Pending', value: all.filter((f) => f.status === 'Pending').length + n('overdue'), icon: 'warning', tone: 'red' },
          ]} />
          <SearchBar value={q} onChangeText={setQ} placeholder="Search pet or owner…" />
          <FilterChips active={active} onChange={setActive} allCount={all.length} options={[
            { key: 'overdue', label: 'Overdue', count: n('overdue'), color: '#DC2626', soft: '#FEE2E2' }, { key: 'today', label: 'Today', count: n('today'), color: '#EA580C', soft: '#FFEDD5' },
            { key: 'week', label: 'This week', count: n('week'), color: '#2563EB', soft: '#DBEAFE' }, { key: 'later', label: 'Later', count: n('later') },
          ]} />
          <Text className={T.small}>{rows.loading ? 'Loading…' : `${list.length} follow-up${list.length === 1 ? '' : 's'}`}</Text>
        </View>
      }
      ListEmptyComponent={rows.loading ? <ChatListSkeleton count={4} /> : <Empty emoji="🔁" title="No follow-ups" body={all.length ? 'Nothing matches your filters.' : 'Follow-up dates you set on prescriptions show up here.'} />}
      renderItem={({ item: f }) => {
        const b = bucket(f.date);
        return (
          <DoctorRow image={f.image} title={f.pet} subtitle={`${f.owner}${f.breed ? ` · ${f.breed}` : ''}`} caption={`${formatIsoDate(f.date)}${f.time ? ` · ${f.time}` : ''}`}
            right={b === 'overdue' ? <View className="bg-red-100 rounded-full px-2.5 py-1"><Text className="text-[10px] font-bold text-red-600">OVERDUE</Text></View> : b === 'today' ? <View className="bg-orange-100 rounded-full px-2.5 py-1"><Text className="text-[10px] font-bold text-orange-600">TODAY</Text></View> : <WebStatusBadge status={f.status} />}
            onPress={f.petId ? () => navigation.navigate('PatientDetail', { petId: f.petId }) : f.appointmentId ? () => navigation.navigate('DoctorAppointment', { id: f.appointmentId }) : undefined} />
        );
      }}
      ListFooterComponent={!rows.loading ? <LoadMoreFooter hasMore={page.hasMore} total={page.total} noun="follow-ups" /> : undefined} />
  );
}
