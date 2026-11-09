import React, { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Empty, T } from '../../components/ui';
import SearchBar from '../../components/common/SearchBar';
import LoadMoreFooter from '../../components/LoadMoreFooter';
import { ChatListSkeleton } from '../../components/Skeletons';
import { DoctorRow, PageHeader, WebStatGrid } from '../../components/doctor/DoctorUI';
import { useRemote } from '../../hooks/useRemote';
import { useInfiniteSlice } from '../../hooks/useInfiniteSlice';
import { doctorService } from '../../services/doctor.service';
import { useDoctor } from '../../context/DoctorContext';
import { formatIsoDate } from '../../utils/petAge';

/** Medical records - the web page: stat cards, then every record you wrote (tap one to edit it). */
export default function MedicalRecordsScreen({ navigation }: any) {
  const { tick } = useDoctor();
  const [q, setQ] = useState('');
  const rows = useRemote(() => doctorService.records(), [], tick);
  const all = rows.data ?? [];
  const month = new Date().toISOString().slice(0, 7);
  const list = useMemo(() => all.filter((r) => `${r.pet} ${r.owner} ${r.diagnosis} ${r.recordNo ?? ''}`.toLowerCase().includes(q.trim().toLowerCase())), [all, q]);
  const page = useInfiniteSlice(list, 10, q);

  return (
    <FlatList className="flex-1 bg-cream" contentContainerClassName="p-4 gap-3 pb-10" data={rows.loading ? [] : page.items} keyExtractor={(r) => r.id}
      refreshing={rows.refreshing} onRefresh={rows.reload} onEndReached={page.loadMore} onEndReachedThreshold={0.4}
      ListHeaderComponent={
        <View className="gap-3.5 mb-1">
          <PageHeader icon="flask" title="Medical Records" subtitle="Diagnoses and treatments from your consultations." />
          <WebStatGrid stats={[
            { title: 'Medical Records', value: all.length, icon: 'clipboard', tone: 'orange' },
            { title: 'This Month', value: all.filter((r) => r.visitDate.startsWith(month)).length, icon: 'calendar', tone: 'blue' },
            { title: 'Diagnoses', value: new Set(all.map((r) => r.diagnosis.trim().toLowerCase()).filter(Boolean)).size, icon: 'medkit', tone: 'purple' },
            { title: 'Follow Ups', value: all.filter((r) => r.visitType === 'Follow Up').length, icon: 'repeat', tone: 'green' },
          ]} />
          <SearchBar value={q} onChangeText={setQ} placeholder="Search pet, owner or diagnosis…" />
          <Text className={T.small}>{rows.loading ? 'Loading…' : `${list.length} record${list.length === 1 ? '' : 's'}`}</Text>
          {!!rows.error && !rows.loading && <Text className="text-red text-sm">{rows.error}</Text>}
        </View>
      }
      ListEmptyComponent={rows.loading ? <ChatListSkeleton count={4} /> : <Empty emoji="📋" title="No medical records" body={all.length ? 'Nothing matches your search.' : 'Records you write after consultations appear here.'} />}
      renderItem={({ item: r }) => (
        <DoctorRow image={r.image} title={r.pet} subtitle={r.diagnosis || r.treatment || 'No diagnosis'} caption={`${r.owner}${r.visitDate ? ` · ${formatIsoDate(r.visitDate)}` : ''} · ${r.visitType}`}
          onPress={r.appointmentId ? () => navigation.navigate('MedicalRecordForm', { appointmentId: r.appointmentId }) : undefined} />
      )}
      ListFooterComponent={!rows.loading ? <LoadMoreFooter hasMore={page.hasMore} total={page.total} noun="records" /> : undefined} />
  );
}
