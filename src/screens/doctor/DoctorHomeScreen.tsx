import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Chip, Gradient, cn } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import AppointmentCard from '../../components/appointments/AppointmentCard';
import BottomSheet from '../../components/common/BottomSheet';
import RescheduleSheet from '../../components/appointments/RescheduleSheet';
import { DashboardSkeleton } from '../../components/Skeletons';
import { toast } from '../../components/WonPetsAlert';
import { Panel, PanelHeader, TONES, CompactStatRow, DTone } from '../../components/doctor/DoctorUI';
import CompletableRow, { ROW_EXIT_TOTAL_MS } from '../../components/dashboard/CompletableRow';
import { useRemote } from '../../hooks/useRemote';
import { useDoctorActions } from '../../hooks/useDoctorActions';
import { doctorService } from '../../services/doctor.service';
import type { DoctorPatient } from '../../services/doctor.mappers';
import { useDoctor } from '../../context/DoctorContext';
import { useAuth } from '../../context/AuthContext';
import type { Appointment } from '../../data/mock';
import { timeToMinutes } from '../../utils/schedule';
import { formatIsoDate } from '../../utils/petAge';
import { inr } from '../../utils/orders';
import PlanEndedBanner from '../../components/settings/PlanEndedBanner';

type Icon = keyof typeof Ionicons.glyphMap;

type QuickAction = { title: string; icon: Icon; tone: DTone; go?: string; params?: object; action?: 'consultation' };
/** Same six shortcuts, in the same order, as the web dashboard's "Quick Actions" panel. */
const QUICK: QuickAction[] = [
  { title: 'Set Availability', icon: 'calendar', tone: 'orange', go: 'Availability' },
  { title: 'Start Consultation', icon: 'videocam', tone: 'green', action: 'consultation' },
  { title: 'Add Prescription', icon: 'document-text', tone: 'pink', go: 'Prescriptions' },
  { title: 'Manage Treatment', icon: 'heart', tone: 'red', go: 'FollowUps' },
  { title: 'Collaborations', icon: 'people', tone: 'blue', go: 'DoctorProfile', params: { open: 'shared' } },
  { title: 'View Medical Records', icon: 'folder-open', tone: 'purple', go: 'MedicalRecords' },
];

/** Same labels / colours the web uses for a patient's latest appointment status. */
const patientStatus = (status?: string): { label: string; bg: string; fg: string } => {
  switch (status) {
    case 'Completed': return { label: 'Completed', bg: 'bg-green-100', fg: 'text-green-600' };
    case 'In Progress': return { label: 'In Treatment', bg: 'bg-purple-100', fg: 'text-purple-600' };
    case 'Confirmed': case 'Upcoming': return { label: status, bg: 'bg-blue-100', fg: 'text-blue-600' };
    case 'Pending': return { label: 'Pending', bg: 'bg-yellow-100', fg: 'text-yellow-700' };
    case 'Cancelled': return { label: 'Cancelled', bg: 'bg-red-100', fg: 'text-red-600' };
    default: return { label: status || '-', bg: 'bg-slate-100', fg: 'text-slate-600' };
  }
};
const COLLAB_STATUS: Record<string, string> = { Active: 'bg-green-100 text-green-700', Pending: 'bg-purple-100 text-purple-600', Upcoming: 'bg-blue-100 text-blue-600' };
const fmtLong = (iso?: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '');

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning,' : h < 17 ? 'Good Afternoon,' : 'Good Evening,';
};

// Today's list shows about four visits; any more scroll inside the card instead of stretching the page.
const APPT_ROW_H = 52, APPT_ROW_GAP = 8, APPT_LIST_MAX = APPT_ROW_H * 4 + APPT_ROW_GAP * 3;

/** One of the three fixed-size tiles in Today's Overview. */
function OverviewTile({ icon, tone, label, value, sub, progress }: { icon: Icon; tone: DTone; label: string; value: string; sub: string; progress?: number }) {
  const t = TONES[tone];
  return (
    <View className={cn('flex-1 h-[104px] rounded-2xl p-2.5 justify-between', t.pale)}>
      <View className="flex-row items-center gap-1.5">
        <View className={cn('w-7 h-7 rounded-full items-center justify-center', t.soft)}><Ionicons name={icon} size={13} color={t.fg} /></View>
        <Text maxFontSizeMultiplier={1.1} className="flex-1 text-[10px] text-slate-500 leading-[12px]" numberOfLines={2}>{label}</Text>
      </View>
      <View>
        <Text maxFontSizeMultiplier={1.1} className="text-[15px] font-extrabold text-slate-800" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>{value}</Text>
        <Text maxFontSizeMultiplier={1.1} className={cn('text-[10px] font-semibold', t.text)} numberOfLines={1}>{sub}</Text>
        {progress != null && <View className="mt-1 h-1 bg-green-100 rounded-full overflow-hidden"><View style={{ width: `${progress}%` }} className="h-full bg-green-500 rounded-full" /></View>}
      </View>
    </View>
  );
}

/** Slim "all done" note shown once the last visit of the day has slid away (waits for the exit animation, like the owner dashboard). */
function DoneNote({ show }: { show: boolean }) {
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!show) { op.setValue(0); return; }
    Animated.timing(op, { toValue: 1, duration: 350, delay: ROW_EXIT_TOTAL_MS, useNativeDriver: true }).start();
  }, [show]);
  if (!show) return null;
  return (
    <Animated.View style={{ opacity: op }} className="flex-row items-center justify-center gap-2 py-4">
      <Text className="text-2xl">🎉</Text>
      <View>
        <Text className="text-[14px] font-bold text-ink">All done for today</Text>
        <Text className="text-[11px] text-muted">Completed visits are tucked away.</Text>
      </View>
    </Animated.View>
  );
}

/** Hero card in the owner dashboard's style: soft cream gradient, big orange name, round photo and a white quick-stats strip. */
function DoctorHero({ name, image, remaining, next, rate, earned, onNext, onEarnings }: {
  name: string; image?: string | null; remaining: number; next?: Appointment; rate: number; earned: string; onNext: () => void; onEarnings: () => void;
}) {
  return (
    <Gradient colorsArr={['#FFEFCE', '#FFFFFF']} className="rounded-3xl p-3.5 border border-[#F2C46D] overflow-hidden">
      <Chip label={`${remaining} ${remaining === 1 ? 'Appointment' : 'Appointments'} Remaining`} tone="white" />
      <View className="flex-row items-center gap-3 mt-2.5">
        <View className="flex-1">
          <Text maxFontSizeMultiplier={1.1} className="text-[13px] font-semibold text-muted">{greeting()}</Text>
          <Text maxFontSizeMultiplier={1.1} className="text-[22px] font-black text-primary leading-7" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>Dr. {name} 👋</Text>
          <Text maxFontSizeMultiplier={1.1} className="text-[12px] text-muted leading-4 mt-1" numberOfLines={2}>
            {remaining ? 'Your patients are counting on you today. ' : 'No visits left for today. '}<Text className="text-green font-bold">Thank you for caring.</Text> 🧡
          </Text>
        </View>
        <View className="rounded-full p-1 bg-orange-300">
          <View className="rounded-full bg-white p-1"><Avatar image={image} emoji="🩺" size={68} /></View>
        </View>
      </View>
      <View className="flex-row bg-white rounded-2xl border border-line mt-3 py-2">
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

/** Slide-up version of the web's "Patient Details" drawer: profile card, six facts and the five actions. */
function PatientSheet({ p, onClose, onRecords, onRx, onProfile, onCall, onResched }: {
  p: DoctorPatient | null; onClose: () => void; onRecords: () => void; onRx: () => void; onProfile: () => void; onCall: () => void; onResched: () => void;
}) {
  if (!p) return null;
  const st = patientStatus(p.status);
  const facts: [string, string][] = [
    ['Age', p.age || '-'], ['Gender', p.gender || '-'], ['Owner', p.owner || '-'], ['Phone', p.phone || '-'],
    ['Last Visit', formatIsoDate(p.lastVisit) || '-'], ['Next Visit', formatIsoDate(p.nextVisit) || '-'],
  ];
  const btn = 'flex-1 py-3 rounded-xl items-center active:opacity-70';
  return (
    <BottomSheet visible onClose={onClose} title="Patient Details" subtitle="Pet information">
      <Gradient colorsArr={['#F97316', '#F59E0B']} className="rounded-2xl p-4 overflow-hidden">
        <View className="flex-row items-center gap-3">
          <View className="rounded-full border-4 border-white"><Avatar image={p.image} emoji={p.emoji} size={56} /></View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-white" numberOfLines={1}>{p.name}</Text>
            <Text className="text-sm text-orange-100" numberOfLines={1}>{p.breed}</Text>
            <View className="self-start mt-1.5 rounded-full bg-white/20 px-2.5 py-0.5"><Text className="text-[10px] text-white">{p.status ? st.label : 'Healthy'}</Text></View>
          </View>
        </View>
      </Gradient>
      <View className="flex-row flex-wrap gap-3">
        {facts.map(([k, v]) => (
          <View key={k} className="w-[48.2%] bg-white rounded-2xl border border-line p-3">
            <Text className="text-[10px] text-slate-500">{k}</Text>
            <Text className="font-bold text-sm text-ink mt-0.5" numberOfLines={1}>{v}</Text>
          </View>
        ))}
      </View>
      <View className="gap-2.5">
        <View className="flex-row gap-2.5">
          <Pressable onPress={onRecords} accessibilityRole="button" className={cn(btn, 'bg-orange-100')}><Text className="text-sm font-medium text-orange-600">Records</Text></Pressable>
          <Pressable onPress={onRx} accessibilityRole="button" className={cn(btn, 'bg-blue-100')}><Text className="text-sm font-medium text-blue-600">Prescription</Text></Pressable>
        </View>
        <View className="flex-row gap-2.5">
          <Pressable onPress={onProfile} accessibilityRole="button" className={cn(btn, 'bg-purple-100')}><Text className="text-sm font-medium text-purple-600">View Profile</Text></Pressable>
          <Pressable onPress={onCall} accessibilityRole="button" className={cn(btn, 'bg-green-100')}><Text className="text-sm font-medium text-green-600">Call Owner</Text></Pressable>
        </View>
        {!!p.appointmentId && <Pressable onPress={onResched} accessibilityRole="button" className="py-3 rounded-xl items-center bg-primary active:opacity-80"><Text className="text-sm font-medium text-white">Reschedule Visit</Text></Pressable>}
      </View>
    </BottomSheet>
  );
}

/** Doctor dashboard - the web dashboard, stacked for a phone: stat cards, today's overview, quick actions, recent patients, collaborations, this month's stats. */
export default function DoctorHomeScreen({ navigation }: any) {
  const { tick } = useDoctor();
  const { user } = useAuth();
  const [resched, setResched] = useState<Appointment | null>(null);
  const [sheet, setSheet] = useState<DoctorPatient | null>(null);
  const dash = useRemote(() => doctorService.dashboard(), [], tick);
  const pending = useRemote(() => doctorService.pending(), [], tick);
  const reload = () => { dash.reloadQuiet(); pending.reloadQuiet(); };
  const act = useDoctorActions(reload);

  const d = dash.data;
  const today = useMemo(() => (d?.schedule ?? []).filter((a) => a.status !== 'Cancelled').sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)), [d]);
  const remaining = today.filter((a) => a.status !== 'Completed');
  const completedToday = today.length - remaining.length;
  const completionPct = today.length ? Math.round((completedToday / today.length) * 100) : 0;
  const next = remaining[0];
  const open = (a: Appointment) => navigation.navigate('DoctorAppointment', { id: a.id });
  const requests = pending.data ?? [];

  const reschedule = async (patch: { isoDate: string; time: string }) => {
    if (!resched) return false;
    try { await doctorService.reschedule(resched.id, patch.isoDate, patch.time); toast.success('Appointment moved'); reload(); return true; }
    catch (e: any) { toast.error(e.message); return false; }
  };
  /** Patients only know their appointment id, so load it before opening the reschedule sheet. */
  const rescheduleById = async (appointmentId?: string) => {
    if (!appointmentId) return toast.info('There is no appointment to move yet.');
    try { setResched(await doctorService.appointment(appointmentId)); } catch (e: any) { toast.error(e.message); }
  };
  /** Online visits go straight into the call; clinic / home visits open the schedule (same as the web). */
  const startConsultation = (a?: Appointment) => {
    if (a && a.mode === 'Online') return act.join(a);
    navigation.navigate('DoctorSchedule');
  };
  const quick = (q: QuickAction) => (q.action === 'consultation' ? startConsultation(next) : navigation.navigate(q.go!, q.params));
  const withSheet = (fn: (p: DoctorPatient) => void) => () => { const p = sheet; if (!p) return; setSheet(null); fn(p); };

  if (dash.loading && !d) return <DashboardSkeleton />;

  const stats: { title: string; caption: string; value: number; icon: Icon; tone: DTone; go: () => void }[] = [
    { title: 'Today', caption: 'Scheduled today', value: d?.stats.today ?? 0, icon: 'cube', tone: 'orange', go: () => navigation.navigate('DoctorSchedule') },
    { title: 'Completed', caption: 'All completed cases', value: d?.stats.completed ?? 0, icon: 'checkmark-circle', tone: 'green', go: () => navigation.navigate('DoctorSchedule', { tab: 'past' }) },
    { title: 'Pending', caption: 'Awaiting appointments', value: d?.stats.pending ?? 0, icon: 'time', tone: 'purple', go: () => navigation.navigate('DoctorSchedule', { tab: 'requests' }) },
    { title: 'Cancelled', caption: 'No cancellations', value: d?.stats.cancelled ?? 0, icon: 'close-circle', tone: 'blue', go: () => navigation.navigate('DoctorSchedule', { tab: 'past' }) },
  ];
  const month = d?.monthStats;
  const monthCards: { label: string; value: string | number; icon: Icon; tone: DTone }[] = [
    { label: 'Visits', value: month?.visits ?? 0, icon: 'calendar', tone: 'orange' },
    { label: 'Consultations', value: month?.consultations ?? 0, icon: 'paw', tone: 'green' },
    { label: 'Earnings', value: inr(month?.earnings ?? 0), icon: 'cash', tone: 'purple' },
  ];
  const collabs = d?.collaborations ?? [];
  const openCollabs = () => navigation.navigate('DoctorProfile', { open: 'shared', at: Date.now() });

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="p-3.5 gap-3 pb-8"
      refreshControl={<RefreshControl refreshing={dash.refreshing} onRefresh={() => { dash.reload(); pending.reloadQuiet(); }} tintColor={colors.primary} />}>

      <PlanEndedBanner onRenew={() => navigation.navigate('DoctorProfile', { open: 'subscription', at: Date.now() })} />

      <DoctorHero
        name={(user?.name ?? 'Doctor').replace(/^dr\.?\s+/i, '').trim().split(' ')[0]} image={user?.profileImage}
        remaining={remaining.length} next={next} rate={d?.stats.completionRate ?? 0} earned={inr(d?.overview.revenue ?? 0)}
        onNext={() => next && open(next)} onEarnings={() => navigation.navigate('Earnings')} />

      {/* stat cards - one row */}
      <CompactStatRow stats={stats.map((st) => ({ title: st.title, value: st.value, icon: st.icon, tone: st.tone, onPress: st.go }))} />

      {/* new booking requests - the first one here, the rest in the schedule */}
      {requests.length > 0 && (
        <Panel compact className="border-amber-200">
          <PanelHeader compact icon="notifications" tone="amber" title="Waiting for you" caption={`${requests.length} new request${requests.length === 1 ? '' : 's'}`}
            action={requests.length > 1 ? `View All (${requests.length})` : undefined} onAction={() => navigation.navigate('DoctorSchedule', { tab: 'requests' })} />
          <AppointmentCard key={requests[0].id} viewer="doctor" item={requests[0]} onOpen={() => open(requests[0])} actions={act.actionsFor(requests[0])} />
        </Panel>
      )}

      {/* today's overview */}
      <Panel compact>
        <PanelHeader compact icon="calendar" title="Today's Overview" action="Calendar" onAction={() => navigation.navigate('DoctorSchedule')} />
        <View className="flex-row gap-2">
          <OverviewTile icon="calendar-outline" tone="purple" label="Next Appointment" value={next ? next.time : 'None'} sub={next?.pet || 'All done'} />
          <OverviewTile icon="time-outline" tone="orange" label="Working Hours" value={`${d?.overview.workingHours ?? 8} hrs`} sub="Today's Shift" />
          <OverviewTile icon="checkmark-circle-outline" tone="green" label="Completion" value={`${completedToday}/${today.length}`} sub={`${completionPct}% Complete`} progress={completionPct} />
        </View>

        {/* today's visits - about four rows show, the rest scroll; a completed visit slides away like a finished task on the owner dashboard */}
        <View className="mt-3">
          {today.length === 0 ? (
            <View className="flex-row items-center gap-3 bg-orange-50/60 border border-orange-100 rounded-2xl p-3">
              <View className="w-9 h-9 rounded-xl bg-orange-100 items-center justify-center"><Ionicons name="calendar" size={17} color={colors.primary} /></View>
              <View className="flex-1">
                <Text className="text-[14px] font-bold text-slate-800">No appointments today</Text>
                <Text className="text-[11px] text-slate-400" numberOfLines={1}>Nothing is scheduled for today.</Text>
              </View>
            </View>
          ) : (
            <>
              <Text className="text-[11px] font-semibold text-muted mb-1.5">{remaining.length} {remaining.length === 1 ? 'visit' : 'visits'} left today</Text>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={remaining.length > 4} style={{ maxHeight: APPT_LIST_MAX }}>
                {today.map((a) => {
                  const [hh = '--', mer = ''] = (a.time ?? '').split(' ');
                  const isNext = a.id === next?.id;
                  return (
                    <CompletableRow key={a.id} done={a.status === 'Completed'} gap={APPT_ROW_GAP}>
                      <Pressable onPress={() => open(a)} accessibilityRole="button" accessibilityLabel={`${a.pet} at ${a.time}`}
                        style={{ height: APPT_ROW_H }} className={cn('flex-row items-center gap-2.5 rounded-2xl border px-2.5 active:opacity-70', isNext ? 'bg-orange-50 border-orange-200' : 'bg-cream border-line')}>
                        <View className="w-[46px] items-center">
                          <Text maxFontSizeMultiplier={1.1} className="text-[13px] font-extrabold text-orange-600">{hh}</Text>
                          <Text maxFontSizeMultiplier={1.1} className="text-[9px] font-bold text-orange-600 uppercase">{mer}</Text>
                        </View>
                        <Avatar image={a.petImage} emoji={a.emoji} size={34} />
                        <View className="flex-1">
                          <Text maxFontSizeMultiplier={1.1} className="text-[13px] font-bold text-slate-900" numberOfLines={1}>{a.pet}</Text>
                          <Text maxFontSizeMultiplier={1.1} className="text-[11px] text-slate-500" numberOfLines={1}>{[a.owner, a.mode].filter(Boolean).join(' • ') || a.reason || 'Consultation'}</Text>
                        </View>
                        {isNext
                          ? <Pressable hitSlop={6} onPress={() => startConsultation(a)} accessibilityRole="button" accessibilityLabel="Start consultation" className="w-8 h-8 rounded-full bg-primary items-center justify-center active:opacity-80"><Ionicons name="play" size={13} color="#fff" /></Pressable>
                          : <Ionicons name="chevron-forward" size={15} color="#CBD5E1" />}
                      </Pressable>
                    </CompletableRow>
                  );
                })}
              </ScrollView>
              <DoneNote show={remaining.length === 0} />
            </>
          )}
        </View>
      </Panel>

      {/* quick actions - 3 x 2 compact tiles */}
      <Panel compact>
        <PanelHeader compact icon="medkit" title="Quick Actions" />
        <View className="flex-row flex-wrap gap-2">
          {QUICK.map((q) => (
            <Pressable key={q.title} onPress={() => quick(q)} accessibilityRole="button" accessibilityLabel={q.title} className={cn('w-[31.6%] h-[78px] rounded-2xl items-center justify-center gap-1 px-1 active:opacity-70', TONES[q.tone].pale)}>
              <View className="w-9 h-9 rounded-xl bg-white items-center justify-center"><Ionicons name={q.icon} size={18} color={TONES[q.tone].fg} /></View>
              <Text maxFontSizeMultiplier={1.1} className={cn('font-bold text-[10px] leading-[12px] text-center', TONES[q.tone].text)} numberOfLines={2}>{q.title}</Text>
            </Pressable>
          ))}
        </View>
      </Panel>

      {/* recent patients - four small circles side by side */}
      <Panel compact>
        <PanelHeader compact icon="paw" title="Recent Patients" action="View All" onAction={() => navigation.navigate('DoctorPatients')} />
        {d?.recentPatients.length ? (
          <View className="flex-row">
            {d.recentPatients.slice(0, 4).map((p) => {
              const st = patientStatus(p.status);
              return (
                <Pressable key={p.petId} onPress={() => setSheet(p)} accessibilityRole="button" accessibilityLabel={`${p.name}, ${st.label}`} className="w-1/4 items-center px-0.5 active:opacity-70">
                  <View className="rounded-full border-2 border-orange-100"><Avatar image={p.image} emoji={p.emoji} size={52} /></View>
                  <Text maxFontSizeMultiplier={1.1} className="text-[12px] font-bold text-slate-800 mt-1.5" numberOfLines={1}>{p.name}</Text>
                  <View className={cn('mt-1 rounded-full px-1.5 py-0.5', st.bg)}><Text maxFontSizeMultiplier={1.1} className={cn('text-[9.5px] font-semibold', st.fg)} numberOfLines={1}>{st.label}</Text></View>
                </Pressable>
              );
            })}
          </View>
        ) : <Text className="py-4 text-center text-sm text-slate-400">No patients yet. They will appear here after your first visit.</Text>}
      </Panel>

      {/* collaborations - hidden when there are none, same as the web; top two only */}
      {collabs.length > 0 && (
        <Panel compact>
          <PanelHeader compact icon="people" tone="blue" title="Collaborations" action="View All" onAction={openCollabs} />
          <View className="gap-1">
            {collabs.slice(0, 2).map((c) => (
              <Pressable key={c.id} onPress={openCollabs} accessibilityRole="button" accessibilityLabel={`${c.owner}, ${c.status}`} className="flex-row items-center gap-2.5 rounded-xl p-1 active:bg-orange-50">
                <Avatar image={c.ownerImage} emoji="👤" size={38} />
                <View className="flex-1">
                  <Text className="font-bold text-[13px] text-slate-800" numberOfLines={1}>{c.owner}</Text>
                  <Text className="text-[11px] text-slate-500" numberOfLines={1}>{c.pets.length ? `Pets: ${c.pets.join(', ')}` : 'Pet owner'}{c.endDate ? `  ·  Till ${fmtLong(c.endDate)}` : ''}</Text>
                </View>
                <View className={cn('rounded-full px-2 py-0.5', (COLLAB_STATUS[c.status] ?? 'bg-slate-100 text-slate-600').split(' ')[0])}>
                  <Text className={cn('text-[10.5px] font-semibold', (COLLAB_STATUS[c.status] ?? 'bg-slate-100 text-slate-600').split(' ')[1])}>{c.status}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Panel>
      )}

      {/* this month's stats */}
      <Panel compact>
        <PanelHeader compact icon="bar-chart" title="This Month's Stats" />
        <View className="flex-row gap-2">
          {monthCards.map((m) => (
            <View key={m.label} className={cn('flex-1 rounded-xl px-1.5 py-2 items-center', TONES[m.tone].pale)}>
              <View className={cn('w-8 h-8 rounded-full items-center justify-center', TONES[m.tone].soft)}><Ionicons name={m.icon} size={15} color={TONES[m.tone].fg} /></View>
              <Text className="mt-1 text-[10px] text-slate-600" numberOfLines={1}>{m.label}</Text>
              <Text className="text-[15px] font-bold text-slate-900" numberOfLines={1} adjustsFontSizeToFit>{m.value}</Text>
            </View>
          ))}
        </View>
      </Panel>

      <PatientSheet p={sheet} onClose={() => setSheet(null)}
        onRecords={withSheet((p) => navigation.navigate('PatientDetail', { petId: p.petId, tab: 'history' }))}
        onRx={withSheet((p) => (p.appointmentId ? navigation.navigate('PrescriptionForm', { appointmentId: p.appointmentId }) : navigation.navigate('Prescriptions')))}
        onProfile={withSheet((p) => navigation.navigate('PatientDetail', { petId: p.petId }))}
        onCall={() => { if (sheet?.phone) Linking.openURL(`tel:${sheet.phone}`); else toast.info('No phone number on file.'); }}
        onResched={withSheet((p) => rescheduleById(p.appointmentId))} />

      {resched && <RescheduleSheet visible viewer="doctor" appointment={{ ...resched, doctorId: user?.id }} onClose={() => setResched(null)} onConfirm={reschedule} />}
    </ScrollView>
  );
}