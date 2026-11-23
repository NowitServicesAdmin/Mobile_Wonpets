import { useLiveSync } from '../../context/LiveSyncContext';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, Empty, Gradient, T, cn } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import { Panel, PanelHeader } from '../../components/doctor/DoctorUI';
import CompletableRow, { ROW_EXIT_TOTAL_MS } from '../../components/dashboard/CompletableRow';
import { toast } from '../../components/WonPetsAlert';
import { useAuth } from '../../context/AuthContext';
import { useManaged } from '../../context/ManagedContext';
import { ManagedTask, SharedAppointment, SharedPet, managedService, todayIso } from '../../services/managed.service';
import { errorMessage } from '../../services/api';
import { timeToMinutes } from '../../utils/schedule';

type IconName = keyof typeof Ionicons.glyphMap;

// Same approach as the owner dashboard: fixed-height rows, a few show, the rest scroll inside the card instead of stretching the page.
const ROW_H = 50;
const ROW_GAP = 6;
const VISIBLE_ROWS = 4;
const LIST_MAX = ROW_H * VISIBLE_ROWS + ROW_GAP * (VISIBLE_ROWS - 1);
const CARD_GAP = 10;
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

/** Overlapping pet photos for the hero (kept small so the hero stays short). */
function PetStack({ pets }: { pets: SharedPet[] }) {
  const shown = pets.slice(0, 3);
  const extra = pets.length - shown.length;
  return (
    <View className="flex-row items-center">
      {shown.map((p, i) => (
        <View key={p.id} style={{ marginLeft: i === 0 ? 0 : -14, zIndex: shown.length - i }} className="rounded-full border-[3px] border-white">
          <Avatar image={p.image} emoji={p.emoji} size={46} />
        </View>
      ))}
      {extra > 0 && (
        <View style={{ marginLeft: -14 }} className="w-[46px] h-[46px] rounded-full bg-primary border-[3px] border-white items-center justify-center">
          <Text className="text-white font-extrabold text-[13px]">+{extra}</Text>
        </View>
      )}
    </View>
  );
}

type TileProps = { icon: IconName; box: string; fg: string; value: number | string; label: string };
function StatTile({ icon, box, fg, value, label }: TileProps) {
  return (
    <View className="flex-1 bg-white rounded-2xl border border-line px-1.5 py-2 items-center">
      <View className={cn('w-7 h-7 rounded-full items-center justify-center', box)}><Ionicons name={icon} size={15} color={fg} /></View>
      <Text maxFontSizeMultiplier={1.1} className="text-[15px] font-black text-ink leading-5 mt-1">{value}</Text>
      <Text maxFontSizeMultiplier={1.1} className="text-[10px] text-muted" numberOfLines={1}>{label}</Text>
    </View>
  );
}

/** Slim "all done" note once the last task has slid away (waits for the exit animation). */
function DoneNote({ show }: { show: boolean }) {
  const op = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!show) { op.setValue(0); return; }
    Animated.timing(op, { toValue: 1, duration: 350, delay: ROW_EXIT_TOTAL_MS, useNativeDriver: true }).start();
  }, [show]);
  if (!show) return null;
  return (
    <Animated.View style={{ opacity: op }} className="flex-row items-center justify-center gap-2 py-3">
      <Text className="text-2xl">🎉</Text>
      <View>
        <Text className="text-[14px] font-bold text-ink">All done for today</Text>
        <Text className="text-[11px] text-muted">Completed tasks are tucked away.</Text>
      </View>
    </Animated.View>
  );
}

/** Home of the collaborator view: today's care schedule for the pets shared with you. */
export default function SharedHomeScreen() {
  const { user } = useAuth();
  const { accounts, exitManaged } = useManaged();
  const { width } = useWindowDimensions();
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
  const pct = actionable.length ? Math.round((completedCount / actionable.length) * 100) : 0;
  const nextTask = visible.find((t) => t.status !== 'completed');

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
  // screen padding (14 x 2) + panel padding (14 x 2); with several visits the next card peeks in from the right
  const inner = width - 56;
  const cardW = upcoming.length > 1 ? Math.min(300, Math.round(inner * 0.86)) : inner;
  const multiOwner = owners.length > 1;

  return (
    <ScrollView
      className="flex-1 bg-cream"
      contentContainerClassName="p-3.5 gap-3 pb-8"
      refreshControl={<RefreshControl refreshing={loading && pets.length > 0} onRefresh={load} tintColor={colors.primary} />}
    >
      {/* hero: same size and layout as the owner dashboard hero; the 4th tile switches back to My Account */}
      <Gradient colorsArr={['#FFEFCE', '#FFFFFF']} className="rounded-3xl p-3.5 border border-[#F2C46D] overflow-hidden">
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text maxFontSizeMultiplier={1.1} className="text-[13px] font-semibold text-muted">{greeting()}</Text>
            <Text maxFontSizeMultiplier={1.1} className="text-[22px] font-black text-primary leading-7" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{firstName} 👋</Text>
            <Text maxFontSizeMultiplier={1.1} className="text-[12px] text-muted leading-4 mt-1" numberOfLines={2}>
              {pets.length > 0
                ? <>Caring for <Text className="text-green font-bold">{pets.length} {pets.length === 1 ? 'pet' : 'pets'}</Text>{owners.length ? ` from ${owners.join(', ')}` : ''} 🧡</>
                : 'Pets shared with you will show up here.'}
            </Text>
          </View>
          {pets.length > 0 && <PetStack pets={pets} />}
        </View>

        <View className="flex-row gap-1.5 mt-3">
          <StatTile icon="paw-outline" box="bg-orange-100" fg="#F97316" value={pets.length} label="Pets" />
          <StatTile icon="time-outline" box="bg-purple-100" fg="#8B5CF6" value={remaining} label="Tasks left" />
          <StatTile icon="medkit-outline" box="bg-blue-100" fg="#3B82F6" value={upcoming.length} label="Visits" />
          <Pressable
            onPress={exitManaged}
            accessibilityRole="button"
            accessibilityLabel="Switch to My Account"
            className="flex-1 bg-primary-soft rounded-2xl border border-primary px-1.5 py-2 items-center justify-center active:opacity-80"
          >
            <View className="w-7 h-7 rounded-full bg-white items-center justify-center"><Ionicons name="swap-horizontal" size={15} color={colors.primary} /></View>
            <Text maxFontSizeMultiplier={1.1} className="text-[10.5px] font-extrabold text-primary mt-1.5" numberOfLines={1}>My Account</Text>
          </Pressable>
        </View>
      </Gradient>

      {loading && pets.length === 0 ? (
        <View className="py-16 items-center"><ActivityIndicator color={colors.primary} /></View>
      ) : pets.length === 0 ? (
        <Card><Empty emoji="🐾" title="No shared pets yet" body="When an owner shares their pets with you and the access dates start, they show up here." /></Card>
      ) : (
        <>
          {/* today's schedule */}
          <Panel compact className="border-orange-100">
            <View className="flex-row items-center gap-2 mb-2.5">
              <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center"><Ionicons name="calendar" size={15} color={colors.primary} /></View>
              <View className="flex-1">
                <Text maxFontSizeMultiplier={1.1} className="text-[15px] font-extrabold text-ink" numberOfLines={1}>Today's Schedule</Text>
                <Text maxFontSizeMultiplier={1.1} className="text-[11px] text-muted" numberOfLines={1}>
                  {remaining} {remaining === 1 ? 'task' : 'tasks'} left{nextTask ? ` · Next ${nextTask.time}` : ''}
                </Text>
              </View>
            </View>

            {/* pet filter: one slim row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5 mb-2.5">
              <Pressable onPress={() => setPetId('all')} accessibilityRole="button" accessibilityState={{ selected: petId === 'all' }} className={cn('h-8 justify-center rounded-full border px-3.5', petId === 'all' ? 'bg-primary border-primary' : 'bg-white border-line')}>
                <Text className={cn('text-xs font-bold', petId === 'all' ? 'text-white' : 'text-ink')}>All pets</Text>
              </Pressable>
              {pets.map((p) => {
                const on = petId === p.id;
                return (
                  <Pressable key={p.id} onPress={() => setPetId(p.id)} accessibilityRole="button" accessibilityLabel={p.name} accessibilityState={{ selected: on }} className={cn('h-8 flex-row items-center gap-1.5 rounded-full border pl-1 pr-3', on ? 'bg-primary border-primary' : 'bg-white border-line')}>
                    <Avatar image={p.image} emoji={p.emoji} size={24} />
                    <Text className={cn('text-xs font-bold', on ? 'text-white' : 'text-ink')}>{p.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {visible.length === 0 ? (
              <View className="flex-row items-center gap-3 bg-orange-50/60 border border-orange-100 rounded-2xl p-3">
                <View className="w-9 h-9 rounded-xl bg-orange-100 items-center justify-center"><Ionicons name="calendar" size={17} color={colors.primary} /></View>
                <View className="flex-1">
                  <Text className="text-[14px] font-bold text-ink">Nothing planned today</Text>
                  <Text className="text-[11px] text-muted" numberOfLines={1}>No tasks or visits for the shared pets.</Text>
                </View>
              </View>
            ) : (
              <>
                {/* progress: one slim bar */}
                <View className="flex-row items-center gap-2 mb-2.5">
                  <View className="flex-1 h-1.5 bg-orange-100 rounded-full overflow-hidden"><View style={{ width: `${pct}%` }} className="h-full bg-primary rounded-full" /></View>
                  <Text maxFontSizeMultiplier={1.1} className="text-[11px] font-bold text-muted">{completedCount}/{actionable.length} done · {pct}%</Text>
                </View>

                {/* only the list scrolls, the card stays put */}
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={visible.length > VISIBLE_ROWS} style={{ maxHeight: LIST_MAX }}>
                  {visible.map((t) => {
                    const st = taskStyle(t);
                    const isAppt = t.itemType === 'appointment';
                    const done = t.status === 'completed';
                    const pet = petById[t.petId];
                    return (
                      <CompletableRow key={t.key} done={done} gap={ROW_GAP}>
                        <View style={{ height: ROW_H }} className={cn('flex-row items-center gap-2 rounded-2xl border px-2.5', done ? 'bg-white border-green-soft' : 'bg-cream border-line')}>
                          <View className={cn('w-9 h-9 rounded-xl items-center justify-center', st.box)}><Ionicons name={st.icon} size={17} color={st.fg} /></View>
                          <View className="flex-1">
                            <Text maxFontSizeMultiplier={1.1} className={cn('text-[13px] font-extrabold', done ? 'line-through text-muted' : 'text-ink')} numberOfLines={1}>{t.title}</Text>
                            <Text maxFontSizeMultiplier={1.1} className="text-[11px] text-muted" numberOfLines={1}>
                              <Text className="font-bold text-primary">{t.time}</Text>{`  ·  ${pet?.name ?? 'Pet'}`}{multiOwner && t.ownerName ? ` (${t.ownerName})` : ''}
                            </Text>
                          </View>
                          {isAppt ? (
                            <View className="bg-blue-soft px-2 py-1 rounded-full">
                              <Text maxFontSizeMultiplier={1.1} className="text-[10px] font-bold text-blue">{t.apptStatus || 'Confirmed'}</Text>
                            </View>
                          ) : done ? (
                            <View className="w-8 h-8 rounded-full bg-green-soft items-center justify-center"><Ionicons name="checkmark" size={17} color={colors.green} /></View>
                          ) : (
                            <Pressable onPress={() => complete(t)} accessibilityRole="button" accessibilityLabel={`Mark ${t.title} complete`} className="w-8 h-8 rounded-full bg-primary items-center justify-center active:opacity-80">
                              <Ionicons name="checkmark" size={18} color="#fff" />
                            </Pressable>
                          )}
                        </View>
                      </CompletableRow>
                    );
                  })}
                </ScrollView>
                <DoneNote show={visible.every((t) => t.status === 'completed')} />
              </>
            )}
          </Panel>

          {/* upcoming appointments: a swipeable strip, so it never makes the page taller */}
          <Panel compact>
            <PanelHeader compact icon="medkit" tone="blue" title={`Upcoming Visits • ${upcoming.length}`} caption="View only" />
            {upcoming.length === 0 ? (
              <Text className={cn(T.small, 'py-1 text-center')}>No upcoming appointments.</Text>
            ) : (
              <FlatList
                data={upcoming}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(a) => a.id}
                snapToInterval={cardW + CARD_GAP}
                decelerationRate="fast"
                contentContainerStyle={{ gap: CARD_GAP }}
                renderItem={({ item: a }) => {
                  const d = a.isoDate ? new Date(`${a.isoDate}T00:00:00`) : null;
                  const ok = a.status === 'Confirmed';
                  return (
                    <View style={{ width: cardW }} className="flex-row items-center gap-2.5 rounded-2xl border border-orange-100 bg-orange-50/60 p-2.5">
                      <View className="w-[44px] rounded-xl bg-white border border-line items-center py-1">
                        <Text className="text-[9.5px] font-extrabold text-primary">{d ? MONTHS[d.getMonth()] : '—'}</Text>
                        <Text className="text-[18px] font-black text-ink leading-5">{d ? d.getDate() : '--'}</Text>
                      </View>
                      <View className="flex-1">
                        <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[13px] font-extrabold text-ink">{a.pet} · {a.mode}</Text>
                        <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[11px] text-muted">{a.time}{a.doctor ? ` · ${a.doctor}` : ''}</Text>
                        {multiOwner && <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="text-[11px] text-muted">{a.ownerName}</Text>}
                      </View>
                      <View className={cn('px-2 py-1 rounded-full', ok ? 'bg-green-soft' : 'bg-yellow-soft')}>
                        <Text maxFontSizeMultiplier={1.1} className={cn('text-[10px] font-bold', ok ? 'text-green' : 'text-yellow')}>{a.status}</Text>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </Panel>
        </>
      )}
    </ScrollView>
  );
}