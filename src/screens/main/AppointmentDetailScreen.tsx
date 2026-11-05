import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Card, Chip, Empty, Gradient, T } from '../../components/ui';
import { AppointmentDetailSkeleton } from '../../components/Skeletons';
import PetAvatar from '../../components/PetAvatar';
import { Avatar } from '../../components/Avatar';
import RescheduleSheet from '../../components/appointments/RescheduleSheet';
import { MODE_ICON, STATUS_META, StatusPill, apptDateParts } from '../../components/appointments/AppointmentCard';
import { WonPetsAlert, toast } from '../../components/WonPetsAlert';
import { appointmentsService } from '../../services/appointments.service';
import { usePets } from '../../context/PetsContext';
import { useChat } from '../../context/ChatContext';
import { inr } from '../../utils/orders';

const messages: Record<string, string> = {
  Pending: 'Your request is waiting for confirmation from the doctor.',
  Confirmed: 'Confirmed! Please be ready a few minutes before the scheduled time.',
  'In Progress': 'Your consultation is in progress.',
  Completed: 'Consultation completed. Thank you for visiting WONPET!',
  Cancelled: 'This appointment has been cancelled.',
};

const isImageUrl = (u: string) => /\.(png|jpe?g|webp|gif|heic)(\?|$)/i.test(u);
const fileName = (u: string) => { try { return decodeURIComponent(u.split('?')[0].split('/').pop() || 'Attachment'); } catch { return 'Attachment'; } };

const InfoRow = ({ icon, k, v }: { icon: React.ComponentProps<typeof Ionicons>['name']; k: string; v?: string }) => (
  <View className="flex-row items-center gap-3">
    <View className="w-8 h-8 rounded-xl bg-primary-soft items-center justify-center"><Ionicons name={icon} size={15} color={colors.primary} /></View>
    <Text className={T.body + ' flex-1'}>{k}</Text>
    <Text className="text-sm font-bold text-ink flex-shrink text-right max-w-[55%]">{v || '—'}</Text>
  </View>
);

export default function AppointmentDetailScreen({ route, navigation }: any) {
  const { appointments, cancelAppointment, rescheduleAppointment, upsertAppointment } = usePets();
  const { registerContact } = useChat();
  const insets = useSafeAreaInsets();
  const [resched, setResched] = useState(false);
  const [fetched, setFetched] = useState(false);
  const a = appointments.find((x) => x.id === route.params.id);
  // the list is already loaded; fetch the single appointment for the freshest status / doctor details
  useEffect(() => {
    appointmentsService.get(route.params.id).then(upsertAppointment, () => {}).finally(() => setFetched(true));
  }, [route.params.id]);
  if (!a) return fetched ? <View className="flex-1 bg-cream justify-center"><Empty emoji="🩺" title="Appointment not found" body="It may have been removed." /></View> : <AppointmentDetailSkeleton />;

  const meta = STATUS_META[a.status] ?? STATUS_META.Pending;
  const p = apptDateParts(a);
  const open = a.status === 'Pending' || a.status === 'Confirmed';
  const canJoin = a.mode === 'Online' && (a.status === 'Confirmed' || a.status === 'In Progress');
  const canChat = !!a.doctorId && !!a.doctor && a.status !== 'Cancelled';

  const onCancel = async () => {
    const r = await WonPetsAlert.confirm('Cancel appointment?', 'This cannot be undone.', { confirmText: 'Yes, cancel', cancelText: 'Keep' });
    if (!r.isConfirmed) return;
    if (await cancelAppointment(a.id)) toast.success('Appointment cancelled');
  };
  const chat = () => {
    // the vet comes from the real appointment, so add them to the chat list first
    registerContact({ id: a.doctorId!, kind: 'vet', name: a.doctor!, emoji: '👩‍⚕️', subtitle: a.doctorSpec || 'Veterinary', status: 'offline' });
    navigation.navigate('Chat', { tab: 'vet', doctorId: a.doctorId });
  };
  const join = () => navigation.navigate('VideoCall', { id: a.id });

  // one clear primary action in the sticky bar; the rest sit beside it
  const hasBar = canJoin || open || a.status === 'Completed';

  return (
    <View className="flex-1 bg-cream">
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-3.5 pb-8">
        <Gradient className="rounded-3xl p-5 overflow-hidden" colorsArr={['#FF6B00', '#F59E0B']}>
          <View className="flex-row items-start justify-between">
            <PetAvatar emoji={a.emoji} image={a.petImage} size={68} />
            <StatusPill status={a.status} size="md" />
          </View>
          <Text className="text-white text-[26px] font-black mt-3">{a.pet}</Text>
          {!!a.visitType && <Text className="text-white/90 font-semibold">{a.visitType} visit</Text>}
          <Text className="text-white/75 text-[11px] font-bold mt-1">#{a.appointmentNo ?? a.id.slice(-8).toUpperCase()}</Text>
          <View className="flex-row gap-2 mt-4">
            {([['calendar-outline', `${p.wd}, ${p.day} ${p.mon}`], ['time-outline', a.time], [MODE_ICON[a.mode] ?? 'medical-outline', a.mode]] as const).map(([icon, t]) => (
              <View key={t} className="flex-1 bg-white/20 rounded-2xl py-2.5 px-2 items-center gap-0.5">
                <Ionicons name={icon} size={16} color="#fff" />
                <Text className="text-white text-[12px] font-extrabold text-center" numberOfLines={1}>{t}</Text>
              </View>
            ))}
          </View>
        </Gradient>

        {!!messages[a.status] && (
          <View style={{ backgroundColor: meta.soft }} className="flex-row items-center gap-3 rounded-2xl p-3.5">
            <Ionicons name={meta.icon} size={22} color={meta.color} />
            <Text className="flex-1 text-[13px] font-semibold text-ink leading-5">{messages[a.status]}</Text>
          </View>
        )}

        <Card className="gap-3">
          <Text className={T.h2}>Doctor</Text>
          <View className="flex-row items-center gap-3.5">
            <Avatar square image={a.doctorImage} emoji="🩺" size={60} />
            <View className="flex-1">
              <Text className={T.h3}>{a.doctor ?? 'To be assigned'}</Text>
              {!!a.doctorSpec && <Text className={T.small}>{a.doctorSpec}</Text>}
              {!!a.clinic && <View className="flex-row items-center gap-1 mt-0.5"><Ionicons name="location-outline" size={12} color={colors.muted} /><Text className={T.small}>{a.clinic}</Text></View>}
            </View>
            {canChat && (
              <Pressable onPress={chat} accessibilityLabel={`Chat with ${a.doctor}`} className="w-11 h-11 rounded-full bg-primary-soft items-center justify-center active:opacity-80">
                <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
              </Pressable>
            )}
          </View>
        </Card>

        <Card className="gap-3.5">
          <Text className={T.h2}>Details</Text>
          <InfoRow icon="calendar" k="Date" v={`${p.day} ${p.mon} ${p.year}`} />
          <InfoRow icon="time" k="Time" v={a.time} />
          <InfoRow icon="medkit" k="Type" v={a.mode} />
          {!!a.visitType && <InfoRow icon="paw" k="Visit for" v={a.visitType} />}
          {a.mode === 'Home Care' && !!a.homeAddress && (
            <View className="bg-cream rounded-2xl p-3 flex-row gap-2.5"><Ionicons name="home" size={16} color={colors.primary} /><View className="flex-1"><Text className="text-[11px] font-bold text-muted uppercase">Home visit address</Text><Text className="text-sm text-ink leading-5 mt-0.5">{a.homeAddress}</Text></View></View>
          )}
        </Card>

        {(!!a.reason || !!a.attachments?.length) && (
          <Card className="gap-2.5">
            <Text className={T.h2}>Your concern</Text>
            {!!a.reason && <View className="bg-cream rounded-2xl p-3.5"><Text className="text-sm text-ink leading-5">{a.reason}</Text></View>}
            {!!a.attachments?.length && (
              <View className="gap-2.5">
                {a.attachments.some(isImageUrl) && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5">{a.attachments.filter(isImageUrl).map((u) => <Pressable key={u} onPress={() => Linking.openURL(u)}><Image source={{ uri: u }} className="w-20 h-20 rounded-2xl" /></Pressable>)}</ScrollView>}
                {a.attachments.filter((u) => !isImageUrl(u)).map((u) => (
                  <Pressable key={u} onPress={() => Linking.openURL(u)} className="flex-row items-center gap-3 bg-cream border border-line rounded-2xl p-2.5 active:opacity-80">
                    <View className="w-10 h-10 rounded-xl bg-primary-soft items-center justify-center"><Ionicons name="document-text" size={20} color={colors.primary} /></View>
                    <Text className="flex-1 text-[13px] font-bold text-ink" numberOfLines={1}>{fileName(u)}</Text>
                    <Ionicons name="open-outline" size={18} color={colors.muted} />
                  </Pressable>
                ))}
              </View>
            )}
          </Card>
        )}

        <Card className="gap-2.5">
          <View className="flex-row items-center gap-2"><Ionicons name="document-text" size={18} color={colors.primary} /><Text className={T.h2}>Doctor notes</Text></View>
          <View className="bg-primary-soft rounded-2xl p-3.5 border-l-4 border-primary"><Text className="text-sm text-ink leading-5">{a.notes || 'Doctor notes will appear after the consultation.'}</Text></View>
        </Card>

        <Card className="gap-1">
          <Text className={T.small}>Consultation fee</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-[30px] font-black text-primary-dark">{inr(a.fee ?? 0)}</Text>
            <Chip label={a.status === 'Cancelled' ? 'Refund initiated' : a.paymentStatus === 'Paid' ? 'Paid online' : a.paymentStatus || 'Pending'} tone={a.status === 'Cancelled' ? 'red' : 'green'} />
          </View>
        </Card>

        {open && (
          <Pressable onPress={onCancel} className="flex-row items-center justify-center gap-1.5 py-3 active:opacity-70">
            <Ionicons name="close-circle-outline" size={18} color={colors.red} /><Text className="text-red font-bold">Cancel appointment</Text>
          </Pressable>
        )}
      </ScrollView>

      {hasBar && (
        <View style={{ paddingBottom: Math.max(insets.bottom, 12) }} className="bg-white border-t border-line px-4 pt-3 gap-2">
          {canJoin && <Button title="Join video consult" icon={<Ionicons name="videocam" size={18} color="#fff" />} onPress={join} />}
          {a.status === 'Completed' && !!a.hasPrescription && <Button title="View prescription" icon={<Ionicons name="document-text" size={18} color="#fff" />} onPress={() => navigation.navigate('Prescription', { appointmentId: a.id })} />}
          {a.status === 'Completed' && <Button variant={a.hasPrescription ? 'outline' : 'primary'} title="Book a follow-up" onPress={() => navigation.navigate('BookAppointment', { petId: a.petId, doctorId: a.doctorId })} />}
          {open && <Button variant={canJoin ? 'outline' : 'primary'} title="Reschedule" icon={<Ionicons name="calendar-outline" size={18} color={canJoin ? colors.primary : '#fff'} />} onPress={() => setResched(true)} />}
        </View>
      )}

      <RescheduleSheet visible={resched} appointment={a} onClose={() => setResched(false)}
        onConfirm={async (patch) => { const ok = await rescheduleAppointment(a.id, patch); if (ok) toast.success('Reschedule requested — your vet will confirm the new time'); return ok; }} />
    </View>
  );
}