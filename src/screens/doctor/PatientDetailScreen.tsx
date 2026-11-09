import React, { useEffect, useState } from 'react';
import { Linking, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Empty, Gradient, T } from '../../components/ui';
import { Panel as Card, WebStatGrid } from '../../components/doctor/DoctorUI';
import PetAvatar from '../../components/PetAvatar';
import SegmentedTabs from '../../components/common/SegmentedTabs';
import AppointmentCard from '../../components/appointments/AppointmentCard';
import { PetProfileSkeleton, AppointmentListSkeleton } from '../../components/Skeletons';
import { useRemote } from '../../hooks/useRemote';
import { doctorService } from '../../services/doctor.service';
import { useDoctor } from '../../context/DoctorContext';
import { useChat } from '../../context/ChatContext';
import { formatIsoDate } from '../../utils/petAge';

type Tab = 'visits' | 'history' | 'vaccines';

/** One patient: who they are, who owns them, and the full visit / medical / vaccination history with this doctor. */
export default function PatientDetailScreen({ route, navigation }: any) {
  const petId: string = route.params.petId;
  const { tick } = useDoctor();
  const { startConversation } = useChat();
  const [tab, setTab] = useState<Tab>('visits');
  const info = useRemote(() => doctorService.patient(petId), [petId], tick);
  const visits = useRemote(() => doctorService.patientVisits(petId), [petId], tick);
  const history = useRemote(() => doctorService.patientHistory(petId), [petId], tick);
  const vaccines = useRemote(() => doctorService.patientVaccinations(petId), [petId], tick);
  const p = info.data?.patient;
  useEffect(() => { navigation.setOptions({ title: p?.name ?? 'Patient' }); }, [p?.name]);
  if (info.loading && !p) return <PetProfileSkeleton />;
  if (!p) return <View className="flex-1 bg-cream justify-center"><Empty emoji="🐾" title="Patient not found" body={info.error ?? undefined} /></View>;
  const s = info.data!.summary;
  const message = async () => { if (!p.ownerId) return; const cid = await startConversation('vet', p.ownerId); if (cid) navigation.navigate('ChatThread', { conversationId: cid }); };
  const refresh = () => { info.reload(); visits.reloadQuiet(); history.reloadQuiet(); vaccines.reloadQuiet(); };

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="p-4 gap-3.5 pb-10" refreshControl={<RefreshControl refreshing={info.refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <Gradient className="rounded-2xl p-4 overflow-hidden" colorsArr={['#F97316', '#F59E0B']}>
        <View className="flex-row items-center gap-3.5">
          <View className="rounded-full border-4 border-white"><PetAvatar emoji={p.emoji} image={p.image} size={68} /></View>
          <View className="flex-1 gap-0.5">
            <Text className="text-white text-[22px] font-black" numberOfLines={1}>{p.name}</Text>
            <Text className="text-orange-50 text-[13px]" numberOfLines={1}>{[p.breed, p.age, p.gender].filter(Boolean).join(' · ')}</Text>
            <View className="flex-row gap-1.5 flex-wrap mt-1">
              {!!info.data?.weight && <View className="bg-white/25 rounded-full px-2.5 py-0.5"><Text className="text-[10.5px] text-white font-semibold">{info.data.weight}</Text></View>}
              {!!p.nextVisit && <View className="bg-white/25 rounded-full px-2.5 py-0.5"><Text className="text-[10.5px] text-white font-semibold">Follow-up {formatIsoDate(p.nextVisit)}</Text></View>}
            </View>
          </View>
        </View>
      </Gradient>

      <Card className="gap-3">
        <View className="flex-row items-center gap-3">
          <View className="flex-1"><Text className="text-[10px] font-bold text-orange-500 uppercase">Owner</Text><Text className={T.h3} numberOfLines={1}>{p.owner || '—'}</Text>{!!p.phone && <Text className={T.small}>{p.phone}</Text>}</View>
        </View>
        <View className="flex-row gap-2">
          {!!p.phone && <Button title="Call" variant="outline" className="flex-1 py-2.5" icon={<Ionicons name="call-outline" size={16} color={colors.primary} />} onPress={() => Linking.openURL(`tel:${p.phone}`)} />}
          {!!p.ownerId && <Button title="Chat" variant="outline" className="flex-1 py-2.5" icon={<Ionicons name="chatbubble-outline" size={16} color={colors.primary} />} onPress={message} />}
        </View>
      </Card>

      <WebStatGrid stats={[
        { title: 'Visits', value: s.visits, icon: 'calendar', tone: 'orange' }, { title: 'Completed', value: s.completed, icon: 'checkmark-circle', tone: 'green' },
        { title: 'Records', value: s.records, icon: 'clipboard', tone: 'purple' }, { title: 'Vaccines', value: s.vaccinations, icon: 'shield-checkmark', tone: 'blue' },
      ]} />

      <SegmentedTabs value={tab} onChange={setTab} tabs={[{ key: 'visits', label: 'Visits', icon: 'calendar-outline' }, { key: 'history', label: 'History', icon: 'clipboard-outline' }, { key: 'vaccines', label: 'Vaccines', icon: 'shield-checkmark-outline' }]} />

      {tab === 'visits' && (visits.loading ? <AppointmentListSkeleton /> : visits.data?.length
        ? visits.data.map((a) => <AppointmentCard key={a.id} viewer="doctor" item={a} onOpen={() => navigation.navigate('DoctorAppointment', { id: a.id })} />)
        : <Empty emoji="🩺" title="No visits yet" />)}

      {tab === 'history' && (history.loading ? <AppointmentListSkeleton count={2} /> : history.data?.length
        ? history.data.map((h) => (
          <Card key={h.id} className="gap-2">
            <View className="flex-row items-center justify-between"><Text className={T.h3}>{h.diagnosis || h.treatment || 'Visit'}</Text><Text className={T.small}>{formatIsoDate(h.date)}</Text></View>
            {!!h.doctor && <Text className={T.small}>Dr. {h.doctor.replace(/^dr\.?\s+/i, '')}</Text>}
            {[['Symptoms', h.symptoms], ['Treatment', h.treatment], ['Prescription', h.prescription], ['Notes', h.notes]].filter(([, v]) => !!v).map(([k, v]) => (
              <View key={k} className="bg-cream rounded-xl p-2.5"><Text className="text-[9px] text-muted uppercase">{k}</Text><Text className="text-[13px] text-ink mt-0.5 leading-[18px]">{v}</Text></View>
            ))}
            {!!h.followUpDate && <View className="flex-row items-center gap-1.5"><Ionicons name="repeat" size={14} color={colors.primary} /><Text className="text-xs font-bold text-primary">Follow-up {formatIsoDate(h.followUpDate)}</Text></View>}
          </Card>
        )) : <Empty emoji="📋" title="No medical history" body="Records appear after consultations." />)}

      {tab === 'vaccines' && (vaccines.loading ? <AppointmentListSkeleton count={2} /> : vaccines.data?.length
        ? vaccines.data.map((v) => (
          <Card key={v.id} className="flex-row items-center gap-3">
            <View className="w-11 h-11 rounded-xl bg-blue-soft items-center justify-center"><Ionicons name="shield-checkmark" size={20} color={colors.blue} /></View>
            <View className="flex-1"><Text className={T.h3} numberOfLines={1}>{v.name}</Text><Text className={T.small}>Given {formatIsoDate(v.date)}{v.vet ? ` · Dr. ${v.vet.replace(/^dr\.?\s+/i, '')}` : ''}</Text>{!!v.nextDue && <Text className="text-xs font-bold text-primary mt-0.5">Next due {formatIsoDate(v.nextDue)}</Text>}</View>
          </Card>
        )) : <Empty emoji="💉" title="No vaccinations" body="Nothing has been recorded for this pet." />)}
    </ScrollView>
  );
}
