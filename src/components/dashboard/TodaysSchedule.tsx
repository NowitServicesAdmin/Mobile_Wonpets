import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, T, cn } from '../ui';
import PetAvatar from '../PetAvatar';
import { Panel } from '../doctor/DoctorUI';
import CompletableRow, { ROW_EXIT_TOTAL_MS } from './CompletableRow';
import type { Pet } from '../../data/mock';
import type { ScheduleItem } from '../../context/PetsContext';

type Props = {
  pets: Pet[];
  scheduleFor: (petId: string) => ScheduleItem[];
  completeTask: (item: ScheduleItem) => void;
  onDeleteTask: (item: ScheduleItem) => void;
  onPauseTask: (item: ScheduleItem) => void;
  onAddSchedule: () => void;
  onOpenPet: (pet: Pet) => void;
  initialPetId?: string;
};

type IconName = keyof typeof Ionicons.glyphMap;

function itemStyle(t: ScheduleItem): { icon: IconName; box: string; fg: string } {
  if (t.itemType === 'appointment') return { icon: 'medkit-outline', box: 'bg-blue-soft', fg: colors.blue };
  if (t.itemType === 'medicine') return { icon: 'medical-outline', box: 'bg-purple-soft', fg: colors.purple };
  const s = t.title.toLowerCase();
  if (s.includes('walk')) return { icon: 'paw-outline', box: 'bg-sky-100', fg: '#0284C7' };
  if (s.includes('meal')) return { icon: 'restaurant-outline', box: 'bg-green-soft', fg: colors.green };
  if (s.includes('water')) return { icon: 'water-outline', box: 'bg-green-soft', fg: colors.green };
  if (s.includes('vet')) return { icon: 'medkit-outline', box: 'bg-red-soft', fg: colors.red };
  if (s.includes('check')) return { icon: 'moon-outline', box: 'bg-green-soft', fg: colors.green };
  return { icon: 'calendar-outline', box: 'bg-green-soft', fg: colors.green };
}

// Fixed-height rows (like the doctor dashboard): about four rows show, the rest scroll inside the card instead of stretching the page.
const ROW_H = 50, ROW_GAP = 6, LIST_MAX = ROW_H * 4 + ROW_GAP * 3;

// Swipe tuning: how far (px) or how fast a horizontal drag must be to switch pets.
const SWIPE_DISTANCE = 50, SWIPE_VELOCITY = 0.5, SLIDE_PX = 36;

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

export default function TodaysSchedule({ pets, scheduleFor, completeTask, onDeleteTask, onPauseTask, onAddSchedule, onOpenPet, initialPetId }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!initialPetId) return;
    const i = pets.findIndex((p) => p.id === initialPetId);
    if (i >= 0) setIdx(i);
  }, [initialPetId, pets]);

  const pet = pets.length ? pets[idx >= pets.length ? 0 : idx] : null;
  const tasks = useMemo(() => (pet ? scheduleFor(pet.id) : []), [pet, scheduleFor]);

  // ---- Pet switching: arrow buttons and horizontal swipe share the same animated `go` ----
  const slideX = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const busy = useRef(false);
  const countRef = useRef(pets.length);
  countRef.current = pets.length;

  /** dir: 1 = next pet (content slides left), -1 = previous pet (content slides right). */
  const go = useRef((dir: 1 | -1) => {
    if (busy.current || countRef.current < 2) { Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start(); return; }
    busy.current = true;
    Animated.parallel([
      Animated.timing(slideX, { toValue: -dir * SLIDE_PX, duration: 110, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 110, useNativeDriver: true }),
    ]).start(() => {
      const n = countRef.current;
      setIdx((i) => { const cur = i >= n ? 0 : i; return (cur + dir + n) % n; });
      slideX.setValue(dir * SLIDE_PX);
      Animated.parallel([
        Animated.timing(slideX, { toValue: 0, duration: 170, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 1, duration: 170, useNativeDriver: true }),
      ]).start(() => { busy.current = false; });
    });
  }).current;

  const pan = useRef(
    PanResponder.create({
      // claim only clearly horizontal drags so vertical page / list scrolling and taps keep working
      onMoveShouldSetPanResponder: (_e, g) => countRef.current > 1 && Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_e, g) => { if (!busy.current) slideX.setValue(g.dx * 0.35); },
      onPanResponderRelease: (_e, g) => {
        if (g.dx <= -SWIPE_DISTANCE || g.vx <= -SWIPE_VELOCITY) go(1);        // swipe left  -> next pet
        else if (g.dx >= SWIPE_DISTANCE || g.vx >= SWIPE_VELOCITY) go(-1);     // swipe right -> previous pet
        else Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => { Animated.spring(slideX, { toValue: 0, useNativeDriver: true }).start(); },
    }),
  ).current;

  if (!pet) {
    return (
      <Card className="items-center py-6">
        <Text className="text-4xl mb-1">🐾</Text>
        <Text className={T.h3}>No pets yet</Text>
        <Text className={T.small + ' mt-1'}>Add your first furry friend to get started.</Text>
      </Card>
    );
  }

  const prev = () => go(-1);
  const next = () => go(1);
  const curIdx = idx >= pets.length ? 0 : idx;

  // appointments are read-only, everything else (incl. medicine doses) is actionable
  const actionable = tasks.filter((t) => t.itemType !== 'appointment');
  const completed = actionable.filter((t) => t.status === 'completed');
  const pending = actionable.filter((t) => t.status !== 'completed');
  const pct = actionable.length ? Math.round((completed.length / actionable.length) * 100) : 0;
  const nextTask = tasks.find((t) => t.status !== 'completed');
  const many = pets.length > 1;

  return (
    <Panel compact className="border-orange-100">
      {/* Header: next task time replaces the old three-tile summary at the bottom */}
      <View className="flex-row items-center gap-2 mb-2.5">
        <View className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center"><Ionicons name="calendar" size={15} color={colors.primary} /></View>
        <View className="flex-1">
          <Text maxFontSizeMultiplier={1.1} className="text-[15px] font-extrabold text-ink" numberOfLines={1}>Today's Schedule</Text>
          <Text maxFontSizeMultiplier={1.1} className="text-[11px] text-muted" numberOfLines={1}>
            {pending.length} {pending.length === 1 ? 'task' : 'tasks'} left{nextTask ? ` · Next ${nextTask.time}` : ''}
          </Text>
        </View>
        <Pressable onPress={onAddSchedule} accessibilityRole="button" accessibilityLabel="Add or manage tasks" className="w-9 h-9 rounded-xl bg-primary items-center justify-center active:opacity-80">
          <Ionicons name="alarm-outline" size={18} color="#fff" />
        </Pressable>
      </View>

      {/* Swipe left / right anywhere on the pet row or task list to change pet (arrows still work) */}
      <Animated.View {...pan.panHandlers} style={{ opacity: fade, transform: [{ translateX: slideX }] }}>
      {/* Pet switcher */}
      <View className="flex-row items-center gap-1.5 mb-2.5">
        {many && (
          <Pressable onPress={prev} accessibilityRole="button" accessibilityLabel="Previous pet" className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center active:opacity-70">
            <Ionicons name="chevron-back" size={16} color={colors.primary} />
          </Pressable>
        )}
        <Pressable onPress={() => onOpenPet(pet)} accessibilityRole="button" accessibilityLabel={`Open ${pet.name}'s profile`} className="flex-1 flex-row items-center gap-2 px-2.5 py-1.5 rounded-xl bg-orange-50 border border-orange-100 active:opacity-80">
          <PetAvatar emoji={pet.emoji} image={pet.image} size={28} />
          <View className="flex-1">
            <Text maxFontSizeMultiplier={1.1} className="font-bold text-[13px] text-ink" numberOfLines={1}>{pet.name}</Text>
            <Text maxFontSizeMultiplier={1.1} className="text-[10px] text-muted" numberOfLines={1}>{pet.breed}</Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
        </Pressable>
        {many && (
          <Pressable onPress={next} accessibilityRole="button" accessibilityLabel="Next pet" className="w-8 h-8 rounded-full bg-orange-100 items-center justify-center active:opacity-70">
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {many && (
        <View className="flex-row items-center justify-center gap-1 mb-2" accessibilityLabel={`Pet ${curIdx + 1} of ${pets.length}. Swipe left or right to switch.`}>
          {pets.map((p, i) => (
            <View key={p.id} className={cn('h-1.5 rounded-full', i === curIdx ? 'w-4 bg-primary' : 'w-1.5 bg-orange-200')} />
          ))}
        </View>
      )}

      {tasks.length === 0 ? (
        <View className="flex-row items-center gap-3 bg-orange-50/60 border border-orange-100 rounded-2xl p-3">
          <View className="w-9 h-9 rounded-xl bg-orange-100 items-center justify-center"><Ionicons name="calendar" size={17} color={colors.primary} /></View>
          <View className="flex-1">
            <Text className="text-[14px] font-bold text-ink">Nothing planned today</Text>
            <Text className="text-[11px] text-muted" numberOfLines={1}>Enjoy your day or add a reminder.</Text>
          </View>
        </View>
      ) : (
        <>
          {/* Progress: one slim bar instead of the old ring + three boxes */}
          <View className="flex-row items-center gap-2 mb-2.5">
            <View className="flex-1 h-1.5 bg-orange-100 rounded-full overflow-hidden"><View style={{ width: `${pct}%` }} className="h-full bg-primary rounded-full" /></View>
            <Text maxFontSizeMultiplier={1.1} className="text-[11px] font-bold text-muted">{completed.length}/{actionable.length} done · {pct}%</Text>
          </View>

          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={tasks.length > 4} style={{ maxHeight: LIST_MAX }}>
            {tasks.map((task) => {
              const st = itemStyle(task);
              const isAppt = task.itemType === 'appointment';
              const isCustom = task.itemType === 'custom-task';
              // a completed task animates out of the list and is then hidden
              const isDone = task.status === 'completed';
              return (
                <CompletableRow key={`${task.itemType}-${task.id}`} done={isDone} gap={ROW_GAP}>
                  <View style={{ height: ROW_H }} className={cn('flex-row items-center gap-2 rounded-2xl border px-2.5', isDone ? 'bg-white border-green-soft' : 'bg-cream border-line')}>
                    <View className={cn('w-9 h-9 rounded-xl items-center justify-center', st.box)}><Ionicons name={st.icon} size={17} color={st.fg} /></View>
                    <View className="flex-1">
                      <Text maxFontSizeMultiplier={1.1} className={cn('text-[13px] font-extrabold', isDone ? 'line-through text-muted' : 'text-ink')} numberOfLines={1}>{task.title}</Text>
                      <Text maxFontSizeMultiplier={1.1} className="text-[11px] text-muted" numberOfLines={1}>
                        <Text className="font-bold text-primary">{task.time}</Text>{task.description ? `  ·  ${task.description}` : ''}
                      </Text>
                    </View>
                    {isCustom && !isAppt && !isDone && (
                      <View className="flex-row gap-1.5">
                        <Pressable hitSlop={6} onPress={() => onPauseTask(task)} accessibilityLabel={`Pause ${task.title}`} className="w-7 h-7 rounded-full bg-white border border-line items-center justify-center"><Ionicons name="pause-outline" size={14} color="#64748B" /></Pressable>
                        <Pressable hitSlop={6} onPress={() => onDeleteTask(task)} accessibilityLabel={`Delete ${task.title}`} className="w-7 h-7 rounded-full bg-white border border-line items-center justify-center"><Ionicons name="trash-outline" size={13} color="#64748B" /></Pressable>
                      </View>
                    )}
                    {isAppt ? (
                      <View className="bg-blue-soft px-2 py-1 rounded-full">
                        <Text maxFontSizeMultiplier={1.1} className="text-[10px] font-bold text-blue">{task.apptStatus || 'Confirmed'}</Text>
                      </View>
                    ) : isDone ? (
                      <View className="w-8 h-8 rounded-full bg-green-soft items-center justify-center"><Ionicons name="checkmark" size={17} color={colors.green} /></View>
                    ) : (
                      <Pressable onPress={() => completeTask(task)} accessibilityRole="button" accessibilityLabel={`Mark ${task.title} complete`} className="w-8 h-8 rounded-full bg-primary items-center justify-center active:opacity-80">
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      </Pressable>
                    )}
                  </View>
                </CompletableRow>
              );
            })}
          </ScrollView>
          <DoneNote show={tasks.every((t) => t.status === 'completed')} />
        </>
      )}
      </Animated.View>
    </Panel>
  );
}