import { useLiveSync } from '../../context/LiveSyncContext';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, Chip, Empty, Gradient, SectionHeader, T, cn } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import ProgressRing from '../../components/ProgressRing';
import { toast } from '../../components/WonPetsAlert';
import { useAuth } from '../../context/AuthContext';
import { useManaged } from '../../context/ManagedContext';
import { ManagedTask, SharedAppointment, SharedPet, managedService, todayIso } from '../../services/managed.service';
import { errorMessage } from '../../services/api';
import { timeToMinutes } from '../../utils/schedule';

type IconName = keyof typeof Ionicons.glyphMap;
// the task list scrolls inside the card (roughly 4 rows visible) instead of stretching the whole screen
const TASK_LIST_MAX_HEIGHT = 320;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning,' : h < 17 ? 'Good Afternoon,' : 'Good Evening,';
}

function taskStyle(t: ManagedTask): { icon: IconName; box: string; fg: string } {
  if (t.itemType === 'appointment') return { icon: 'medkit-outline', box: 'bg-blue-soft', fg: colors.blue };
  if (t.itemType === 'medicine') return { icon: 'medical-outline', box: 'bg-purple-soft', fg: colors.purple };
  const s = t.title.toLowerCase();
  if (s.includes('walk')) return { icon: 'paw-outline', box: 'bg-sky-100', fg: '#0284C7' };
  if (s.includes('meal') || s.includes('feed')) return { icon: 'restaurant-outline', box: 'bg-orange-100', fg: colors.primary };
  if (s.includes('water')) return { icon: 'water-outline', box: 'bg-cyan-100', fg: '#0891B2' };
  return { icon: 'calendar-outline', box: 'bg-green-soft', fg: colors.green };
}

function Stat({ icon, tint, bg, value, label }: { icon: IconName; tint: string; bg: string; value: number | string; label: string }) {
  return (
    <View className="flex-1 flex-row items-center justify-center gap-2 px-1.5">
      <View className={cn('w-9 h-9 rounded-full items-center justify-center', bg)}><Ionicons name={icon} size={18} color={tint} /></View>
      <View>
        <Text maxFontSizeMultiplier={1.1} className="font-extrabold text-ink text-[15px]">{value}</Text>
        <Text maxFontSizeMultiplier={1.1} className="text-[10.5px] text-muted">{label}</Text>
      </View>
    </View>
  );
}

/** Overlapping pet photos for the hero. */
function PetStack({ pets }: { pets: SharedPet[] }) {
  const shown = pets.slice(0, 4);
  const extra = pets.length - shown.length;
  return (
    <View className="flex-row items-center">
      {shown.map((p, i) => (
        <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -16, zIndex: shown.length - i }} className="rounded-full border-[3px] border-white">
          <Avatar image={p.image} emoji={p.emoji} size={52} />
        </View>
      ))}
      {extra > 0 && (
        <View style={{ marginLeft: -16 }} className="w-[52px] h-[52px] rounded-full bg-primary border-[3px] border-white items-center justify-center">
          <Text className="text-white font-extrabold text-sm">+{extra}</Text>
        </View>
      )}
    </View>
  );
}

/** Home of the collaborator view: today's care schedule for the pets shared with you. */
export default function SharedHomeScreen() {
  const { user } = useAuth();
  const { accounts, exitManaged } = useManaged();
  const [pets, setPets] = useState<SharedPet[]>([]);
  const [tasks, setTasks] = useState<ManagedTask[]>([]);
  const [appts, setAppts] = useState<SharedAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [petId, setPetId] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const [p, t, a] = await Promise.all([managedService.pets(accounts), managedService.todaySchedule(accounts), managedService.appointments(accounts)]);
    setPets(p); setTasks(t); setAppts(a);
    setLoading(false);
  }, [accounts]);
  useEffect(() => { load(); }, [load]);
  // live sync: quietly refresh (no skeleton) whenever something new arrives
  const { tick } = useLiveSync();
  useEffect(() => {
    if (!tick) return;
    Promise.all([managedService.pets(accounts), managedService.todaySchedule(accounts), managedService.appointments(accounts)]).then(([p, t, a]) => { setPets(p); setTasks(t); setAppts(a); }).catch(() => {});
  }, [tick]);

  const petById = useMemo(() => Object.fromEntries(pets.map((p) => [p.id, p])), [pets]);
  const today = todayIso();
  const owners = useMemo(() => Array.from(new Set(pets.map((p) => p.ownerName).filter(Boolean))), [pets]);

  // today's appointments are folded into the schedule (read-only), like the web overview
  const apptTasks: ManagedTask[] = useMemo(
    () => appts
      .filter((a) => a.isoDate === today && a.status !== 'Cancelled' && a.petId)
      .map((a) => ({
        key: `appt:${a.id}`, id: a.id, petId: a.petId!, ownerId: a.ownerId, ownerName: a.ownerName, time: a.time, rawTime: a.time24 || '',
        title: a.reason || (a.mode === 'Clinic Visit' ? 'Vet Appointment' : `${a.mode} Appointment`),
        description: `${a.mode}${a.doctor ? ` · ${a.doctor}` : ''}`,
        itemType: 'appointment' as const, status: a.status === 'Completed' ? 'completed' as const : 'upcoming' as const, apptStatus: a.status,
      })),
    [appts, today],
  );

  const visible = useMemo(
    () => [...tasks, ...apptTasks].filter((t) => petId === 'all' || t.petId === petId).sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time)),
    [tasks, apptTasks, petId],
  );
  const actionable = visible.filter((t) => t.itemType !== 'appointment');
  const completedCount = actionable.filter((t) => t.status === 'completed').length;
  const remaining = actionable.length - completedCount;
  const pct = actionable.length ? completedCount / actionable.length : 0;

  const complete = async (t: ManagedTask) => {
    const mark = (status: ManagedTask['status']) => setTasks((xs) => xs.map((x) => (x.key === t.key ? { ...x, status } : x)));
    mark('completed'); // optimistic
    try { await managedService.completeTask(t); toast.success('Task marked as completed!'); }
    catch (e) { mark('upcoming'); toast.error(errorMessage(e, 'Could not mark the task as completed.')); }
  };

  const upcoming = useMemo(
    () => appts
      .filter((a) => (a.isoDate ?? '') >= today && a.status !== 'Cancelled' && a.status !== 'Completed')
      .sort((a, b) => ((a.isoDate ?? '') + (a.time24 || '')).localeCompare((b.isoDate ?? '') + (b.time24 || '')))
      .slice(0, 5),
    [appts, today],
  );

  const firstName = (user?.name ?? 'there').trim().split(' ')[0];

  return (
    <ScrollView
      className="flex-1 bg-cream"
      contentContainerClassName="p-4 gap-[18px] pb-10"
      refreshControl={<RefreshControl refreshing={loading && pets.length > 0} onRefresh={load} tintColor={colors.primary} />}
    >
      {/* hero */}
      <Gradient colorsArr={['#FFEFCE', '#FFFFFF']} className="rounded-3xl p-4 border border-[#F2C46D] overflow-hidden">
        <View className="flex-row items-center justify-between">
          <Chip label="Shared with you" tone="white" />
          <Pressable onPress={exitManaged} accessibilityRole="button" accessibilityLabel="Switch to My Account" className="flex-row items-center gap-1.5 bg-white border border-line rounded-full px-3 py-1.5 active:opacity-80">
            <Ionicons name="swap-horizontal" size={13} color={colors.primary} />
            <Text className="text-primary text-[11px] font-extrabold">My Account</Text>
          </Pressable>
        </View>

        <View className="flex-row items-center gap-3 mt-3.5">
          <View className="flex-1">
            <Text maxFontSizeMultiplier={1.1} className="text-[15px] font-semibold text-muted">{greeting()}</Text>
            <Text maxFontSizeMultiplier={1.1} className="text-[26px] font-black text-primary leading-8" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{firstName} 👋</Text>
            <Text maxFontSizeMultiplier={1.1} className="text-[13px] text-muted leading-[18px] mt-1.5" numberOfLines={3}>
              {pets.length > 0
                ? <>You're looking after <Text className="text-green font-bold">{pets.length} {pets.length === 1 ? 'pet' : 'pets'}</Text>{owners.length ? ` from ${owners.join(', ')}` : ''}. 🧡</>
                : 'Pets shared with you will show up here.'}
            </Text>
          </View>
          {pets.length > 0 && <PetStack pets={pets} />}
        </View>

        <View className="flex-row bg-white rounded-2xl border border-line mt-3.5 py-3">
          <Stat icon="paw-outline" tint={colors.primary} bg="bg-primary-soft" value={pets.length} label="Pets" />
          <View className="w-px bg-line" />
          <Stat icon="time-outline" tint={colors.purple} bg="bg-purple-soft" value={remaining} label="Tasks left" />
          <View className="w-px bg-line" />
          <Stat icon="medkit-outline" tint={colors.blue} bg="bg-blue-soft" value={upcoming.length} label="Visits" />
        </View>

        <View className="flex-row items-center gap-2 mt-3">
          <Ionicons name="eye-outline" size={14} color={colors.muted} />
          <Text className="flex-1 text-[11.5px] text-muted leading-4">View-only access to records. You can mark schedule tasks as done.</Text>
        </View>
      </Gradient>

      {loading && pets.length === 0 ? (
        <View className="py-16 items-center"><ActivityIndicator color={colors.primary} /></View>
      ) : pets.length === 0 ? (
        <Card><Empty emoji="🐾" title="No shared pets yet" body="When an owner shares their pets with you and the access dates start, they show up here." /></Card>
      ) : (
        <>
          {/* pet filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            <Chip label="All pets" active={petId === 'all'} onPress={() => setPetId('all')} className="py-2 px-4" />
            {pets.map((p) => {
              const on = petId === p.id;
              return (
                <Pressable key={p.id} onPress={() => setPetId(p.id)} accessibilityRole="button" accessibilityLabel={p.name} className={cn('flex-row items-center gap-2 rounded-full border pl-1 pr-3.5 py-1', on ? 'bg-primary border-primary' : 'bg-white border-line')}>
                  <Avatar image={p.image} emoji={p.emoji} size={28} />
                  <Text className={cn('text-xs font-bold', on ? 'text-white' : 'text-ink')}>{p.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* today's schedule (same design as the owner dashboard) */}
          <Card className="border-orange-100">
            {/* header */}
            <View className="flex-row items-center gap-2.5 mb-3">
              <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center"><Ionicons name="calendar-outline" size={19} color={colors.primary} /></View>
              <View className="flex-1">
                <Text className={T.h2}>Today's Schedule</Text>
                <Text className={T.small}>{remaining === 0 && actionable.length > 0 ? 'All done for today 🎉' : `${remaining} task${remaining === 1 ? '' : 's'} remaining today`}</Text>
              </View>
            </View>

            {/* progress */}
            <View className="flex-row items-center gap-2 bg-orange-100 rounded-2xl p-2.5 mb-3">
              <View className="bg-white/70 rounded-xl h-16 w-[70px] items-center justify-center">
                <ProgressRing color={colors.primary} progress={pct} size={52} stroke={5}>
                  <Text className="text-[11px] font-extrabold text-primary-dark">{Math.round(pct * 100)}%</Text>
                </ProgressRing>
              </View>
              {([['Completed', completedCount, 'text-green'], ['Remaining', remaining, 'text-primary-dark'], ['Total', actionable.length, 'text-muted']] as const).map(([k, v, c]) => (
                <View key={k} className="flex-1 bg-white/70 rounded-xl h-16 px-2.5 justify-center">
                  <Text className="text-[10px] font-medium text-muted">{k}</Text>
                  <Text className={cn('text-lg font-extrabold', c)}>{v}</Text>
                </View>
              ))}
            </View>

            {visible.length === 0 ? (
              <View className="py-10 items-center">
                <Text className="text-4xl mb-2">📅</Text>
                <Text className={T.h3}>Nothing planned today</Text>
                <Text className={T.small + ' mt-1 text-center'}>No tasks or visits are scheduled for the shared pets.</Text>
              </View>
            ) : (
              <>
                {/* only the task list scrolls, the card stays put */}
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  style={{ maxHeight: TASK_LIST_MAX_HEIGHT }}
                  contentContainerStyle={{ gap: 8 }}
                >
                  {visible.map((t) => {
                    const st = taskStyle(t);
                    const isAppt = t.itemType === 'appointment';
                    const done = t.status === 'completed';
                    const pet = petById[t.petId];
                    return (
                      <View key={t.key} className={cn('flex-row items-center gap-2.5 rounded-2xl border px-3 py-2.5', done ? 'bg-white border-green-soft' : 'bg-cream border-line')}>
                        <View className={cn('w-10 h-10 rounded-xl items-center justify-center', st.box)}><Ionicons name={st.icon} size={19} color={st.fg} /></View>
                        <View className="flex-1">
                          <Text maxFontSizeMultiplier={1.1} className={cn('text-[14px] font-extrabold', done ? 'line-through text-muted' : 'text-ink')} numberOfLines={1}>{t.title}</Text>
                          <Text maxFontSizeMultiplier={1.1} className="text-[12px] text-muted mt-0.5" numberOfLines={1}>
                            <Text className="font-bold text-primary">{t.time}</Text>{`  ·  ${pet?.name ?? 'Pet'}`}{t.ownerName ? ` (${t.ownerName})` : ''}
                          </Text>
                          {!!t.description && <Text maxFontSizeMultiplier={1.1} className="text-[11px] text-muted mt-0.5" numberOfLines={1}>{t.description}</Text>}
                        </View>
                        {isAppt ? (
                          <View className="bg-blue-soft px-2.5 py-1.5 rounded-full">
                            <Text maxFontSizeMultiplier={1.1} className="text-[11px] font-bold text-blue">{t.apptStatus || 'Confirmed'}</Text>
                          </View>
                        ) : done ? (
                          <View className="w-9 h-9 rounded-full bg-green-soft items-center justify-center"><Ionicons name="checkmark" size={19} color={colors.green} /></View>
                        ) : (
                          <Pressable onPress={() => complete(t)} accessibilityRole="button" accessibilityLabel={`Mark ${t.title} complete`} className="w-9 h-9 rounded-full bg-primary items-center justify-center active:opacity-80">
                            <Ionicons name="checkmark" size={20} color="#fff" />
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>

                {/* bottom summary */}
                <View className="flex-row gap-2 mt-3 pt-3.5 border-t border-orange-100">
                  {([
                    ['Next Task', visible.find((t) => t.status !== 'completed')?.time ?? '✓', 'calendar-outline', 'bg-purple-soft', colors.purple],
                    ['Total Tasks', String(actionable.length), 'time-outline', 'bg-primary-soft', colors.primary],
                    ['Completed', String(completedCount), 'checkmark-circle-outline', 'bg-green-soft', colors.green],
                  ] as const).map(([k, v, icon, box, fg]) => (
                    <View key={k} className="flex-1 flex-row items-center gap-1.5">
                      <View className={cn('w-8 h-8 rounded-full items-center justify-center', box)}><Ionicons name={icon} size={15} color={fg} /></View>
                      <View className="flex-1">
                        <Text className="text-[9px] text-muted" numberOfLines={1}>{k}</Text>
                        <Text className="text-xs font-bold text-ink" numberOfLines={1}>{v}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Card>

          {/* upcoming appointments */}
          <Card>
            <SectionHeader
              title="Upcoming Appointments"
              subtitle="View only"
              icon={<View className="w-10 h-10 rounded-full bg-blue-soft items-center justify-center"><Ionicons name="medkit-outline" size={19} color={colors.blue} /></View>}
            />
            {upcoming.length === 0 && <Text className={cn(T.small, 'py-2 text-center')}>No upcoming appointments.</Text>}
            <View className="gap-2.5">
              {upcoming.map((a) => {
                const d = a.isoDate ? new Date(`${a.isoDate}T00:00:00`) : null;
                return (
                  <View key={a.id} className="flex-row items-center gap-3 rounded-2xl border border-line p-3">
                    <View className="w-[50px] rounded-2xl bg-primary-soft items-center py-1.5">
                      <Text className="text-[10px] font-extrabold text-primary">{d ? MONTHS[d.getMonth()] : '—'}</Text>
                      <Text className="text-[20px] font-black text-ink leading-6">{d ? d.getDate() : '--'}</Text>
                    </View>
                    <View className="flex-1">
                      <Text numberOfLines={1} className={T.h3}>{a.pet} · {a.mode}</Text>
                      <Text numberOfLines={1} className={T.small}>{a.time}{a.doctor ? ` · ${a.doctor}` : ''}</Text>
                      <Text numberOfLines={1} className={T.small}>{a.ownerName}</Text>
                    </View>
                    <Chip label={a.status} tone={a.status === 'Confirmed' ? 'green' : 'yellow'} />
                  </View>
                );
              })}
            </View>
          </Card>
        </>
      )}
    </ScrollView>
  );
}