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

const todayIso = () => new Date().toISOString().slice(0, 10);
const ACTIVE = ['Pending', 'Confirmed', 'In Progress'];

/** Patients - the web page: four stat cards, then every pet you treat. */
export default function PatientsScreen({ navigation }: any) {
  const { tick } = useDoctor();
  const [q, setQ] = useState('');
  const [active, setActive] = useState<string[]>([]);
  const rows = useRemote(() => doctorService.patients(), [], tick);
  const all = rows.data ?? [];
  const today = todayIso();
  const month = today.slice(0, 7);

  const activeN = all.filter((p) => ACTIVE.includes(p.status ?? '')).length;
  const newN = all.filter((p) => !!p.lastVisit && p.lastVisit.startsWith(month)).length;
  const followN = all.filter((p) => !!p.nextVisit).length;
  const upcoming = all.filter((p) => !!p.nextVisit && p.nextVisit >= today).length;

  const list = useMemo(() => all
    .filter((p) => `${p.name} ${p.owner} ${p.breed}`.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((p) => !active.length || active.some((k) => (k === 'upcoming' ? !!p.nextVisit && p.nextVisit >= today : !p.lastVisit)))
    .sort((a, b) => (b.lastVisit ?? b.nextVisit ?? '').localeCompare(a.lastVisit ?? a.nextVisit ?? '')), [all, q, active, today]);
  const page = useInfiniteSlice(list, 10, `${q}|${active.join()}`);

  return (
    <FlatList
      className="flex-1 bg-cream" contentContainerClassName="p-4 gap-3 pb-10"
      data={rows.loading ? [] : page.items} keyExtractor={(p) => p.petId}
      refreshing={rows.refreshing} onRefresh={rows.reload} onEndReached={page.loadMore} onEndReachedThreshold={0.4}
      ListHeaderComponent={
        <View className="gap-3.5 mb-1">
          <PageHeader icon="people" title="Patients" subtitle="Every pet you have treated or have booked." />
          <WebStatGrid stats={[
            { title: 'Total Patients', value: all.length, icon: 'people', tone: 'orange' },
            { title: 'Active Patients', value: activeN, icon: 'pulse', tone: 'green' },
            { title: 'New This Month', value: newN, icon: 'person-add', tone: 'blue' },
            { title: 'Follow Ups', value: followN, icon: 'calendar', tone: 'purple' },
          ]} />
          <SearchBar value={q} onChangeText={setQ} placeholder="Search pet, owner or breed…" />
          <FilterChips active={active} onChange={setActive} allCount={all.length} options={[{ key: 'upcoming', label: 'Follow-up due', count: upcoming }, { key: 'new', label: 'Not seen yet' }]} />
          <Text className={T.small}>{rows.loading ? 'Loading…' : `${list.length} patient${list.length === 1 ? '' : 's'}`}</Text>
          {!!rows.error && !rows.loading && <Text className="text-red text-sm">{rows.error}</Text>}
        </View>
      }
      ListEmptyComponent={rows.loading ? <ChatListSkeleton count={5} /> : <Empty emoji="🐾" title="No patients" body={all.length ? 'Nothing matches your search.' : 'Pets you treat will appear here.'} />}
      renderItem={({ item: p }) => (
        <DoctorRow image={p.image} emoji={p.emoji} title={p.name}
          subtitle={[p.breed || 'Pet', p.age, p.gender].filter(Boolean).join(' · ')}
          caption={`Owner: ${p.owner || '—'}${p.lastVisit ? ` · Last visit ${formatIsoDate(p.lastVisit)}` : ''}`}
          right={p.status ? <WebStatusBadge status={p.status} /> : p.nextVisit && p.nextVisit >= today ? <View className="bg-blue-100 rounded-full px-2.5 py-1"><Text className="text-[10px] font-bold text-blue-600">NEXT {formatIsoDate(p.nextVisit).slice(0, 5)}</Text></View> : undefined}
          onPress={() => navigation.navigate('PatientDetail', { petId: p.petId })} />
      )}
      ListFooterComponent={!rows.loading ? <LoadMoreFooter hasMore={page.hasMore} total={page.total} noun="patients" /> : undefined}
    />
  );
}
