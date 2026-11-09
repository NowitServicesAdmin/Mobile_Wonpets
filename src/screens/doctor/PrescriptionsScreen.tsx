import React, { useMemo, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { Empty, T } from '../../components/ui';
import SearchBar from '../../components/common/SearchBar';
import LoadMoreFooter from '../../components/LoadMoreFooter';
import { ChatListSkeleton } from '../../components/Skeletons';
import { DoctorRow, PageHeader, WebStatGrid, WebStatusBadge } from '../../components/doctor/DoctorUI';
import { useRemote } from '../../hooks/useRemote';
import { useInfiniteSlice } from '../../hooks/useInfiniteSlice';
import { doctorService } from '../../services/doctor.service';
import { useDoctor } from '../../context/DoctorContext';
import { formatIsoDate } from '../../utils/petAge';

/** Prescriptions - the web page: Total / Today's / Follow Ups / Completed cards, then everything you've issued. */
export default function PrescriptionsScreen({ navigation }: any) {
  const { tick } = useDoctor();
  const [q, setQ] = useState('');
  const rows = useRemote(() => doctorService.prescriptions(), [], tick);
  const all = rows.data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const list = useMemo(() => all
    .filter((r) => `${r.pet} ${r.owner} ${r.diagnosis} ${r.prescriptionNo}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date)), [all, q]);
  const page = useInfiniteSlice(list, 10, q);

  return (
    <FlatList className="flex-1 bg-cream" contentContainerClassName="p-4 gap-3 pb-10" data={rows.loading ? [] : page.items} keyExtractor={(r) => r.id}
      refreshing={rows.refreshing} onRefresh={rows.reload} onEndReached={page.loadMore} onEndReachedThreshold={0.4}
      ListHeaderComponent={
        <View className="gap-3.5 mb-1">
          <PageHeader icon="document-text" title="Prescriptions" subtitle="Prescriptions you issued during consultations." />
          <WebStatGrid stats={[
            { title: 'Total Prescriptions', value: all.length, icon: 'document-text', tone: 'orange' },
            { title: "Today's", value: all.filter((r) => r.date === today).length, icon: 'calendar', tone: 'blue' },
            { title: 'Follow Ups', value: all.filter((r) => !!r.followUpDate).length, icon: 'time', tone: 'purple' },
            { title: 'Completed', value: all.filter((r) => r.status === 'Completed').length, icon: 'checkmark-circle', tone: 'green' },
          ]} />
          <SearchBar value={q} onChangeText={setQ} placeholder="Search pet, owner or diagnosis…" />
          <Text className={T.small}>{rows.loading ? 'Loading…' : `${list.length} prescription${list.length === 1 ? '' : 's'}`}</Text>
        </View>
      }
      ListEmptyComponent={rows.loading ? <ChatListSkeleton count={4} /> : <Empty emoji="📄" title="No prescriptions" body={all.length ? 'Nothing matches your search.' : 'Prescriptions you issue during consultations appear here.'} />}
      renderItem={({ item: r }) => (
        <DoctorRow image={r.petImage} title={r.pet ?? 'Pet'} subtitle={r.diagnosis || 'No diagnosis'} caption={`${r.owner ?? ''}${r.date ? ` · ${formatIsoDate(r.date)}` : ''}${r.prescriptionNo ? ` · ${r.prescriptionNo}` : ''}`}
          right={<WebStatusBadge status={r.status} />}
          onPress={r.appointmentId ? () => navigation.navigate('PrescriptionView', { appointmentId: r.appointmentId }) : undefined} />
      )}
      ListFooterComponent={!rows.loading ? <LoadMoreFooter hasMore={page.hasMore} total={page.total} noun="prescriptions" /> : undefined} />
  );
}
