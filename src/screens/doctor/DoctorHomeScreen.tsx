import React, { useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Chip, Empty, Gradient, cn } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import AppointmentCard, { STATUS_META } from '../../components/appointments/AppointmentCard';
import RescheduleSheet from '../../components/appointments/RescheduleSheet';
import { DashboardSkeleton } from '../../components/Skeletons';
import { toast } from '../../components/WonPetsAlert';
import { IconAction, MiniStat, Panel, PanelHeader, TONES, WebStatGrid, WebStatusBadge, DTone } from '../../components/doctor/DoctorUI';
import { useRemote } from '../../hooks/useRemote';
import { useDoctorActions } from '../../hooks/useDoctorActions';
import { doctorService } from '../../services/doctor.service';
import { useDoctor } from '../../context/DoctorContext';
import { useAuth } from '../../context/AuthContext';
import type { Appointment } from '../../data/mock';
import { timeToMinutes } from '../../utils/schedule';
import { formatIsoDate } from '../../utils/petAge';
import { inr } from '../../utils/orders';

type Icon = keyof typeof Ionicons.glyphMap;

/** Same six shortcuts as the web dashboard's "Quick Actions" panel. */
const QUICK: { title: string; icon: Icon; tone: DTone; go: string; params?: object }[] = [
  { title: "Today's Appointments", icon: 'calendar', tone: 'orange', go: 'DoctorSchedule' },
  { title: 'Patients', icon: 'folder-open', tone: 'blue', go: 'DoctorPatients' },
  { title: 'Prescriptions', icon: 'document-text', tone: 'green', go: 'Prescriptions' },
  { title: 'Follow Ups', icon: 'calendar-number', tone: 'purple', go: 'FollowUps' },
  { title: 'Manage Schedule', icon: 'checkmark-circle', tone: 'amber', go: 'Availability' },
  { title: 'Medical Records', icon: 'flask', tone: 'pink', go: 'MedicalRecords' },
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning,' : h < 17 ? 'Good Afternoon,' : 'Good Evening,';
};

/** Hero card in the owner dashboard's style: soft cream gradient, big orange name, round photo and a white quick-stats strip. */
function DoctorHero({ name, image, remaining, next, rate, earned, onNext, onEarnings }: {
  name: string; image?: string | null; remaining: number; next?: Appointment; rate: number; earned: string; onNext: () => void; onEarnings: () => void;
}) {
  return (
    <Gradient colorsArr={['#FFEFCE', '#FFFFFF']} className="rounded-3xl p-4 border border-[#F2C46D] overflow-hidden">
      <Chip label={`${remaining} ${remaining === 1 ? 'Appointment' : 'Appointments'} Remaining`} tone="white" />
      <View className="flex-row items-center gap-3 mt-3.5">
        <View className="flex-1">
          <Text maxFontSizeMultiplier={1.1} className="text-[15px] font-semibold text-muted">{greeting()}</Text>
          <Text maxFontSizeMultiplier={1.1} className="text-[26px] font-black text-primary leading-8" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Dr. {name} 👋</Text>
          <Text maxFontSizeMultiplier={1.1} className="text-[13px] text-muted leading-[18px] mt-1.5" numberOfLines={3}>
            {remaining ? 'Your patients are counting on you today. ' : 'No visits left for today. '}<Text className="text-green font-bold">Thank you for caring.</Text> 🧡
          </Text>
        </View>
        <View className="rounded-full p-1 bg-orange-300">
          <View className="rounded-full bg-white p-1"><Avatar image={image} emoji="🩺" size={92} /></View>
        </View>
      </View>
      <View className="flex-row bg-white rounded-2xl border border-line mt-3.5 py-3">
        <Pressable disabled={!next} onPress={onNext} accessibilityRole="button" className="flex-1 flex-row items-center justify-center gap-2.5 border-r border-line px-2 active:opacity-70">
          <View className="w-9 h-9 rounded-full bg-purple-soft items-center justify-center"><Ionicons name="calendar-outline" size={18} color={colors.purple} /></View>
          <View className="flex-shrink">
            <Text maxFontSizeMultiplier={1.1} className="font-extrabold text-ink text-[15px]" numberOfLines={1}>{next?.time ?? '-'}</Text>
            <Text maxFontSizeMultiplier={1.1} className="text-[11px] text-muted" numberOfLines={1}>{next ? `Next · ${next.pet}` : 'Next visit'}</Text>
          </View>
        </Pressable>
        <Pressable onPress={onEarnings} accessibilityRole="button" className="flex-1 flex-row items-center justify-center gap-2.5 px-2 active:opacity-70">
          <View className="w-9 h-9 rounded-full bg-green-soft items-center justify-center"><Ionicons name="trending-up" size={18} color={colors.green} /></View>
          <View className="flex-shrink">
            <Text maxFontSizeMultiplier={1.1} className="font-extrabold text-ink text-[15px]" numberOfLines={1}>{rate}%</Text>
            <Text maxFontSizeMultiplier={1.1} className="text-[11px] text-muted" numberOfLines={1}>{earned} earned</Text>
          </View>
        </Pressable>
      </View>
    </Gradient>
  );
}

/** Doctor dashboard - the web dashboard, stacked for a phone: stat cards, today's schedule, quick actions, overview, recent patients, follow-ups. */
export default function DoctorHomeScreen({ navigation }: any) {
  const { tick } = useDoctor();
  const { user } = useAuth();
  const [resched, setResched] = useState<Appointment | null>(null);
  const dash = useRemote(() => doctorService.dashboard(), [], tick);
  const pending = useRemote(() => doctorService.pending(), [], tick);
  const reload = () => { dash.reloadQuiet(); pending.reloadQuiet(); };
  const act = useDoctorActions(reload);

  const d = dash.data;
  const today = useMemo(() => (d?.schedule ?? []).filter((a) => a.status !== 'Cancelled').sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)), [d]);
  const remaining = today.filter((a) => a.status !== 'Completed');
  const completedToday = today.length - remaining.length;
  const next = remaining.find((a) => a.status !== 'Pending') ?? remaining[0];
  const open = (a: Appointment) => navigation.navigate('DoctorAppointment', { id: a.id });
  const requests = pending.data ?? [];

  const reschedule = async (patch: { isoDate: string; time: string }) => {
    if (!resched) return false;
    try { await doctorService.reschedule(resched.id, patch.isoDate, patch.time); toast.success('Appointment moved'); reload(); return true; }
    catch (e: any) { toast.error(e.message); return false; }
  };
  /** Patients and follow-ups only know their appointment id, so load it before opening the reschedule sheet. */
  const rescheduleById = async (appointmentId?: string) => {
    if (!appointmentId) return toast.info('There is no appointment to move yet.');
    try { setResched(await doctorService.appointment(appointmentId)); } catch (e: any) { toast.error(e.message); }
  };

  if (dash.loading && !d) return <DashboardSkeleton />;

  const stats: { title: string; caption: string; value: number; icon: Icon; tone: DTone; go: () => void }[] = [
    { title: "Today's Appointments", caption: 'scheduled today', value: d?.stats.today ?? 0, icon: 'cube', tone: 'orange', go: () => navigation.navigate('DoctorSchedule') },
    { title: 'Completed', caption: 'All completed cases', value: d?.stats.completed ?? 0, icon: 'checkmark-circle', tone: 'green', go: () => navigation.navigate('DoctorSchedule', { tab: 'past' }) },
    { title: 'Pending', caption: 'Awaiting appointments', value: d?.stats.pending ?? 0, icon: 'time', tone: 'purple', go: () => navigation.navigate('DoctorSchedule', { tab: 'requests' }) },
    { title: 'Cancelled', caption: 'Cancelled by you or owners', value: d?.stats.cancelled ?? 0, icon: 'close-circle', tone: 'blue', go: () => navigation.navigate('DoctorSchedule', { tab: 'past' }) },
  ];

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="p-4 gap-4 pb-10"
      refreshControl={<RefreshControl refreshing={dash.refreshing} onRefresh={() => { dash.reload(); pending.reloadQuiet(); }} tintColor={colors.primary} />}>

      <DoctorHero
        name={(user?.name ?? 'Doctor').replace(/^dr\.?\s+/i, '').trim().split(' ')[0]} image={user?.profileImage}
        remaining={remaining.length} next={next} rate={d?.stats.completionRate ?? 0} earned={inr(d?.overview.revenue ?? 0)}
        onNext={() => next && open(next)} onEarnings={() => navigation.navigate('Earnings')} />

      {/* stat cards */}
      <WebStatGrid stats={stats.map((st) => ({ title: st.title, caption: st.caption, value: st.value, icon: st.icon, tone: st.tone, onPress: st.go }))} />

      {/* new booking requests */}
      {requests.length > 0 && (
        <Panel className="border-amber-200">
          <PanelHeader icon="notifications" tone="amber" title="Waiting for you" caption={`${requests.length} new request${requests.length === 1 ? '' : 's'}`}
            action={requests.length > 2 ? 'View All' : undefined} onAction={() => navigation.navigate('DoctorSchedule', { tab: 'requests' })} />
          <View className="gap-3">
            {requests.slice(0, 2).map((a) => <AppointmentCard key={a.id} viewer="doctor" item={a} onOpen={() => open(a)} actions={act.actionsFor(a)} />)}
          </View>
        </Panel>
      )}

      {/* today's schedule */}
      <Panel>
        <PanelHeader icon="calendar" title="Today's Schedule" caption={`${remaining.length} appointment${remaining.length === 1 ? '' : 's'} remaining`} action="Open" onAction={() => navigation.navigate('DoctorSchedule')} />
        <View className="bg-primary-soft rounded-xl py-3 flex-row mb-3.5">
          {([['Total', today.length, 'text-ink'], ['Completed', completedToday, 'text-green-600'], ['Pending', remaining.length, 'text-orange-500']] as const).map(([k, v, c]) => (
            <View key={k} className="flex-1 items-center"><Text className={cn('text-xl font-bold', c)}>{v}</Text><Text className="text-[11px] text-muted">{k}</Text></View>
          ))}
        </View>
        {today.length ? (
          <View className="gap-2.5">
            {today.map((a) => {
              const m = STATUS_META[a.status] ?? STATUS_META.Pending;
              return (
                <Pressable key={a.id} onPress={() => open(a)} accessibilityRole="button" accessibilityLabel={`${a.pet} at ${a.time}`} className="flex-row items-center gap-3 bg-white border border-line rounded-xl p-2.5 active:bg-orange-50">
                  <View className="w-[54px] items-center"><Text className="text-xs font-bold text-orange-500 text-center">{a.time}</Text></View>
                  <View>
                    <Avatar image={a.petImage} emoji={a.emoji} size={44} />
                    <View style={{ backgroundColor: m.color }} className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[14px] font-bold text-ink" numberOfLines={1}>{a.pet}</Text>
                    <Text className="text-xs text-muted" numberOfLines={1}>Owner: {a.owner ?? '—'}</Text>
                    <Text className="text-[11px] text-blue-500" numberOfLines={1}>{a.reason || 'General Consultation'} · {a.mode}</Text>
                  </View>
                  <View style={{ backgroundColor: m.soft }} className="rounded-full px-2.5 py-1"><Text style={{ color: m.color }} className="text-[10px] font-semibold">{a.status}</Text></View>
                </Pressable>
              );
            })}
          </View>
        ) : <Empty emoji="🌤️" title="A free day" body="No visits are booked for today." />}

      </Panel>

      {/* quick actions - same tinted-tile look as the owner dashboard */}
      <Panel>
        <PanelHeader icon="paw" title="Quick Actions" />
        <View className="flex-row flex-wrap gap-y-4">
          {QUICK.map((q) => (
            <Pressable key={q.title} onPress={() => navigation.navigate(q.go)} accessibilityRole="button" accessibilityLabel={q.title} className="w-1/3 items-center gap-1.5 px-1 active:opacity-70">
              <View className={cn('w-[68px] h-[68px] rounded-2xl items-center justify-center', TONES[q.tone].soft)}><Ionicons name={q.icon} size={26} color={TONES[q.tone].fg} /></View>
              <Text maxFontSizeMultiplier={1.1} className={cn('font-bold text-[11.5px] leading-[15px] text-center', TONES[q.tone].text)} numberOfLines={2}>{q.title}</Text>
            </Pressable>
          ))}
        </View>
      </Panel>

      {/* overview */}
      <Panel>
        <Gradient className="rounded-xl h-16 items-center justify-center mb-3.5 overflow-hidden" colorsArr={['#FB923C', '#FBBF24']}>
          <Ionicons name="medkit" size={32} color="rgba(255,255,255,0.92)" />
        </Gradient>
        <View className="flex-row flex-wrap gap-2.5">
          <MiniStat icon="calendar" tone="orange" label="Visits" value={d?.overview.visits ?? 0} />
          <MiniStat icon="cash" tone="green" label="Revenue" value={inr(d?.overview.revenue ?? 0)} />
          <MiniStat icon="person-add" tone="blue" label="New Patients" value={d?.overview.newPatients ?? 0} />
          <MiniStat icon="medkit" tone="purple" label="Treatments" value={d?.overview.treatments ?? 0} />
        </View>
      </Panel>

      {/* recent patients */}
      {!!d?.recentPatients.length && (
        <Panel>
          <PanelHeader title="Recent Patients" action="View All" onAction={() => navigation.navigate('DoctorPatients')} />
          <View className="flex-row flex-wrap gap-3">
            {d.recentPatients.slice(0, 4).map((p) => (
              <View key={p.petId} className="w-[48.2%] bg-white rounded-2xl border border-line p-3">
                <View className="items-center"><View className="rounded-full border-2 border-line"><Avatar image={p.image} emoji={p.emoji} size={58} /></View></View>
                <Text className="text-sm font-bold text-ink text-center mt-2" numberOfLines={1}>{p.name}</Text>
                <Text className="text-[11px] text-muted text-center" numberOfLines={1}>{[p.breed, p.age].filter(Boolean).join(' • ') || 'Pet'}</Text>
                {!!p.status && <View className="items-center mt-2"><WebStatusBadge status={p.status} /></View>}
                <View className="flex-row gap-1.5 mt-3">
                  <IconAction icon="eye" tone="orange" label={`View ${p.name}`} onPress={() => navigation.navigate('PatientDetail', { petId: p.petId })} />
                  <IconAction icon="calendar" tone="purple" label={`Reschedule ${p.name}`} onPress={() => rescheduleById(p.appointmentId)} />
                </View>
              </View>
            ))}
          </View>
        </Panel>
      )}

      {/* follow-ups */}
      {!!d?.followUps.length && (
        <Panel>
          <PanelHeader title="Upcoming Follow-ups" caption="Stay on top of scheduled visits" action="View All" onAction={() => navigation.navigate('FollowUps')} />
          <View className="gap-3">
            {d.followUps.slice(0, 3).map((f) => (
              <View key={f.id} className="bg-white border border-line rounded-xl p-3">
                <View className="flex-row items-center gap-3">
                  <Avatar image={f.image} emoji="🐾" size={46} />
                  <View className="flex-1"><Text className="text-sm font-bold text-ink" numberOfLines={1}>{f.pet}</Text><View className="mt-0.5"><WebStatusBadge status={f.status} /></View></View>
                  <View className="items-end"><Text className="text-xs font-bold text-orange-500">{f.time ?? ''}</Text><Text className="text-[10px] text-muted">{formatIsoDate(f.date).slice(0, 5)}</Text></View>
                </View>
                <View className="border-t border-line my-2.5" />
                <View className="flex-row gap-1.5">
                  <IconAction icon="calendar-outline" tone="orange" label="Reschedule" onPress={() => rescheduleById(f.appointmentId)} />
                  <IconAction icon="call-outline" tone="purple" label="Call owner" onPress={() => (f.phone ? Linking.openURL(`tel:${f.phone}`) : toast.info('No phone number on file.'))} />
                  <IconAction icon="eye-outline" tone="blue" label="View" onPress={() => (f.petId ? navigation.navigate('PatientDetail', { petId: f.petId }) : f.appointmentId ? navigation.navigate('DoctorAppointment', { id: f.appointmentId }) : undefined)} />
                </View>
              </View>
            ))}
          </View>
        </Panel>
      )}

      {resched && <RescheduleSheet visible viewer="doctor" appointment={{ ...resched, doctorId: user?.id }} onClose={() => setResched(null)} onConfirm={reschedule} />}
    </ScrollView>
  );
}
