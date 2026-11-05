import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, T, cn } from '../ui';
import PetAvatar from '../PetAvatar';
import ProgressRing from '../ProgressRing';
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

// the task list scrolls inside the card (roughly 4 rows visible) instead of stretching the whole dashboard
const TASK_LIST_MAX_HEIGHT = 320;

export default function TodaysSchedule({ pets, scheduleFor, completeTask, onDeleteTask, onPauseTask, onAddSchedule, onOpenPet, initialPetId }: Props) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!initialPetId) return;
    const i = pets.findIndex((p) => p.id === initialPetId);
    if (i >= 0) setIdx(i);
  }, [initialPetId, pets]);

  const pet = pets.length ? pets[idx >= pets.length ? 0 : idx] : null;
  const tasks = useMemo(() => (pet ? scheduleFor(pet.id) : []), [pet, scheduleFor]);

  if (!pet) {
    return (
      <Card className="items-center py-8">
        <Text className="text-4xl mb-2">🐾</Text>
        <Text className={T.h3}>No pets yet</Text>
        <Text className={T.small + ' mt-1'}>Add your first furry friend to get started.</Text>
      </Card>
    );
  }

  const prev = () => setIdx((i) => (i === 0 ? pets.length - 1 : i - 1));
  const next = () => setIdx((i) => (i === pets.length - 1 ? 0 : i + 1));

  // appointments are read-only, everything else (incl. medicine doses) is actionable
  const actionable = tasks.filter((t) => t.itemType !== 'appointment');
  const completed = actionable.filter((t) => t.status === 'completed');
  const pending = actionable.filter((t) => t.status !== 'completed');
  const pct = actionable.length ? Math.round((completed.length / actionable.length) * 100) : 0;
  const nextTask = tasks.find((t) => t.status !== 'completed');

  return (
    <Card className="border-orange-100">
      {/* Header */}
      <View className="flex-row items-center gap-2.5 mb-3">
        <View className="w-10 h-10 rounded-full bg-orange-50 items-center justify-center"><Ionicons name="calendar-outline" size={19} color={colors.primary} /></View>
        <View className="flex-1">
          <Text className={T.h2}>Today's Schedule</Text>
          <Text className={T.small}>{pending.length} tasks remaining today</Text>
        </View>
        <Pressable onPress={onAddSchedule} className="w-10 h-10 rounded-xl bg-primary items-center justify-center active:opacity-80">
          <Ionicons name="alarm-outline" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Pet switcher */}
      <View className="flex-row items-center gap-2 mb-3">
        <Pressable disabled={pets.length <= 1} onPress={prev} className={cn('w-9 h-9 rounded-full bg-orange-100 items-center justify-center', pets.length <= 1 && 'opacity-40')}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => onOpenPet(pet)} className="flex-1 flex-row items-center gap-2.5 px-3 py-2 rounded-2xl bg-orange-50 border border-orange-100">
          <PetAvatar emoji={pet.emoji} image={pet.image} size={34} />
          <View className="flex-1">
            <Text className="font-bold text-sm text-ink" numberOfLines={1}>{pet.name}</Text>
            <Text className="text-[11px] text-muted" numberOfLines={1}>{pet.breed}</Text>
          </View>
        </Pressable>
        <Pressable disabled={pets.length <= 1} onPress={next} className={cn('w-9 h-9 rounded-full bg-orange-100 items-center justify-center', pets.length <= 1 && 'opacity-40')}>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </Pressable>
      </View>

      {/* Progress */}
      <View className="flex-row items-center gap-2 bg-orange-100 rounded-2xl p-2.5 mb-3">
        <View className="bg-white/70 rounded-xl h-16 w-[70px] items-center justify-center">
          <ProgressRing color={colors.primary} progress={pct / 100} size={52} stroke={5}>
            <Text className="text-[11px] font-extrabold text-primary-dark">{pct}%</Text>
          </ProgressRing>
        </View>
        {([['Completed', completed.length, 'text-green'], ['Remaining', pending.length, 'text-primary-dark'], ['Total', actionable.length, 'text-muted']] as const).map(([k, v, c]) => (
          <View key={k} className="flex-1 bg-white/70 rounded-xl h-16 px-2.5 justify-center">
            <Text className="text-[10px] font-medium text-muted">{k}</Text>
            <Text className={cn('text-lg font-extrabold', c)}>{v}</Text>
          </View>
        ))}
      </View>

      {tasks.length === 0 ? (
        <View className="py-10 items-center">
          <Text className="text-4xl mb-2">📅</Text>
          <Text className={T.h3}>Nothing planned today</Text>
          <Text className={T.small + ' mt-1 text-center'}>Enjoy your day or create a reminder for your pet.</Text>
        </View>
      ) : (
        <>
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={{ maxHeight: TASK_LIST_MAX_HEIGHT }}
            contentContainerStyle={{ gap: 8 }}
          >
            {tasks.map((task) => {
              const st = itemStyle(task);
              const isAppt = task.itemType === 'appointment';
              const isCustom = task.itemType === 'custom-task';
              const isDone = task.status === 'completed';
              return (
                <View key={`${task.itemType}-${task.id}`} className={cn('flex-row items-center gap-2.5 rounded-2xl border px-3 py-2.5', isDone ? 'bg-white border-green-soft' : 'bg-cream border-line')}>
                  <View className={cn('w-10 h-10 rounded-xl items-center justify-center', st.box)}><Ionicons name={st.icon} size={19} color={st.fg} /></View>
                  <View className="flex-1">
                    <Text maxFontSizeMultiplier={1.1} className={cn('text-[14px] font-extrabold', isDone ? 'line-through text-muted' : 'text-ink')} numberOfLines={1}>{task.title}</Text>
                    <Text maxFontSizeMultiplier={1.1} className="text-[12px] text-muted mt-0.5" numberOfLines={1}>
                      <Text className="font-bold text-primary">{task.time}</Text>{task.description ? `  ·  ${task.description}` : ''}
                    </Text>
                  </View>
                  {isCustom && !isAppt && !isDone && (
                    <View className="flex-row gap-1.5">
                      <Pressable hitSlop={6} onPress={() => onPauseTask(task)} className="w-8 h-8 rounded-full bg-white border border-line items-center justify-center"><Ionicons name="pause-outline" size={15} color="#64748B" /></Pressable>
                      <Pressable hitSlop={6} onPress={() => onDeleteTask(task)} className="w-8 h-8 rounded-full bg-white border border-line items-center justify-center"><Ionicons name="trash-outline" size={14} color="#64748B" /></Pressable>
                    </View>
                  )}
                  {isAppt ? (
                    <View className="bg-blue-soft px-2.5 py-1.5 rounded-full">
                      <Text maxFontSizeMultiplier={1.1} className="text-[11px] font-bold text-blue">{task.apptStatus || 'Confirmed'}</Text>
                    </View>
                  ) : isDone ? (
                    <View className="w-9 h-9 rounded-full bg-green-soft items-center justify-center"><Ionicons name="checkmark" size={19} color={colors.green} /></View>
                  ) : (
                    <Pressable onPress={() => completeTask(task)} accessibilityRole="button" accessibilityLabel={`Mark ${task.title} complete`} className="w-9 h-9 rounded-full bg-primary items-center justify-center active:opacity-80">
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Bottom summary */}
          <View className="flex-row gap-2 mt-3 pt-3.5 border-t border-orange-100">
            {([
              ['Next Task', nextTask?.time ?? '✓', 'calendar-outline', 'bg-purple-soft', colors.purple],
              ['Total Tasks', String(actionable.length), 'time-outline', 'bg-primary-soft', colors.primary],
              ['Completed', String(completed.length), 'checkmark-circle-outline', 'bg-green-soft', colors.green],
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
  );
}