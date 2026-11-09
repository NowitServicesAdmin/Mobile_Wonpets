import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, Text, TextInput, View, type ScrollViewInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, cn } from '../../components/ui';
import CustomDropdown from '../../components/CustomDropdown';
import DateFields from '../../components/DateFields';
import { WonPetsAlert, toast } from '../../components/WonPetsAlert';
import { usePets } from '../../context/PetsContext';
import { timeOptions } from '../../utils/schedule';
import { formatIsoDate } from '../../utils/petAge';

const emptyForm = { title: '', description: '', date: '', time: '', repeatDaily: false, endDate: '' };
const input = 'rounded-xl border border-orange-200 bg-white px-3.5 py-2.5 text-sm text-ink';
const label = 'text-xs font-bold text-ink mb-1.5';
const sw = { transform: [{ scale: 0.9 }] };

function TimePill({ time }: { time: string }) {
  return (
    <View className="w-[66px] items-center bg-primary-soft rounded-lg py-1.5 px-1">
      <Text maxFontSizeMultiplier={1.1} className="text-[11px] font-bold text-primary-dark" numberOfLines={1}>{time}</Text>
    </View>
  );
}

function IconBtn({ icon, tint, bg, label: a11y, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; tint: string; bg: string; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={4} className={cn('w-9 h-9 rounded-full items-center justify-center active:opacity-70', bg)}>
      <Ionicons name={icon} size={16} color={tint} />
    </Pressable>
  );
}

/** Mobile version of the web "Manage Tasks" drawer. */
export default function ManageTasksScreen({ navigation, route }: any) {
  const { pets, dailyTasksFor, loadDailyTasks, ownerTasks, isDailyEnabled, setDailyEnabled, createOwnerTask, updateOwnerTask, deleteOwnerTask, createSchedule } = usePets();
  const [petId, setPetId] = useState<string>(
    pets.some((p) => p.id === route?.params?.petId) ? route.params.petId : pets[0]?.id ?? '',
  );
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const set = (patch: Partial<typeof emptyForm>) => setForm((f) => ({ ...f, ...patch }));

  // daily tasks depend on the pet's animal type, so load them per pet
  useEffect(() => { if (petId) loadDailyTasks(petId); }, [petId]);
  const dailyTasks = dailyTasksFor(petId);
  const myTasks = ownerTasks.filter((t) => t.petId === petId);
  const formOpen = showAdd || !!editingId;

  const cancelForm = () => { setShowAdd(false); setEditingId(null); setForm(emptyForm); };
  const startAdd = () => { setEditingId(null); setForm(emptyForm); setShowAdd(true); setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120); };
  const startEdit = (t: (typeof ownerTasks)[number]) => {
    setShowAdd(false); setEditingId(t.id);
    setForm({ title: t.title, description: t.description, date: '', time: t.time, repeatDaily: true, endDate: t.endDate ?? '' });
  };

  const create = async () => {
    if (!form.title.trim() || !form.time || !form.date) { toast.error('Title, date and time are required.'); return; }
    if (form.repeatDaily) {
      if (!(await createOwnerTask({ petId, title: form.title.trim(), description: form.description.trim(), time: form.time, startDate: form.date, endDate: form.endDate || null }))) return;
      toast.success('Task created');
    } else {
      if (!(await createSchedule({ petId, title: form.title.trim(), description: form.description.trim(), date: form.date, time: form.time }))) return;
      toast.success('Task scheduled');
    }
    cancelForm();
  };

  const update = async () => {
    if (!editingId) return;
    if (!form.title.trim() || !form.time) { toast.error('Title and time are required.'); return; }
    if (!(await updateOwnerTask(editingId, { title: form.title.trim(), description: form.description.trim(), time: form.time, endDate: form.endDate || null }))) return;
    toast.success('Task updated');
    cancelForm();
  };

  const remove = async (id: string, title: string) => {
    const res = await WonPetsAlert.delete('Delete task?', `"${title}" will be removed for this pet.`, { confirmText: 'Yes, delete' });
    if (!res.isConfirmed) return;
    if (await deleteOwnerTask(id)) toast.success('Task deleted');
  };

  const onCount = dailyTasks.filter((t) => isDailyEnabled(petId, t.id)).length;
  const activeMine = myTasks.filter((t) => t.status !== 'Paused').length;

  const panel = 'bg-white border border-orange-100 rounded-3xl overflow-hidden';
  const panelHead = 'flex-row items-center justify-between gap-2 px-4 py-3.5 border-b border-orange-100 bg-orange-50/60';

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-cream">
      <ScrollView ref={scrollRef} contentContainerClassName="p-4 gap-3.5 pb-10" keyboardShouldPersistTaps="handled">
        {/* Pet picker */}
        {pets.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pr-2">
            {pets.map((p) => {
              const active = p.id === petId;
              return (
                <Pressable key={p.id} onPress={() => { setPetId(p.id); cancelForm(); }} accessibilityRole="button" accessibilityState={{ selected: active }} className={cn('flex-row items-center gap-1.5 rounded-full pl-2.5 pr-3.5 py-2 border active:opacity-80', active ? 'bg-primary border-primary' : 'bg-white border-orange-200')}>
                  <Text className="text-base">{p.emoji}</Text>
                  <Text maxFontSizeMultiplier={1.15} className={cn('text-[13px] font-bold', active ? 'text-white' : 'text-ink')}>{p.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* Summary */}
        <View className="flex-row gap-2.5">
          <View className="flex-1 flex-row items-center gap-2.5 bg-white rounded-2xl border border-orange-100 px-3 py-2.5">
            <View className="w-9 h-9 rounded-full bg-green-soft items-center justify-center"><Ionicons name="shield-checkmark" size={17} color={colors.green} /></View>
            <View className="flex-1">
              <Text maxFontSizeMultiplier={1.1} className="text-[18px] font-black text-ink leading-6">{onCount}<Text className="text-xs font-semibold text-muted"> / {dailyTasks.length}</Text></Text>
              <Text maxFontSizeMultiplier={1.1} className="text-[11px] text-muted" numberOfLines={1}>Daily plan on</Text>
            </View>
          </View>
          <View className="flex-1 flex-row items-center gap-2.5 bg-white rounded-2xl border border-orange-100 px-3 py-2.5">
            <View className="w-9 h-9 rounded-full bg-primary-soft items-center justify-center"><Ionicons name="list" size={17} color={colors.primary} /></View>
            <View className="flex-1">
              <Text maxFontSizeMultiplier={1.1} className="text-[18px] font-black text-ink leading-6">{activeMine}</Text>
              <Text maxFontSizeMultiplier={1.1} className="text-[11px] text-muted" numberOfLines={1}>My active tasks</Text>
            </View>
          </View>
        </View>

        {/* Daily care plan */}
        <View className={panel}>
          <View className={panelHead}>
            <View className="flex-row items-center gap-2.5 flex-1">
              <View className="w-9 h-9 rounded-full bg-primary-soft items-center justify-center"><Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} /></View>
              <View className="flex-1">
                <Text maxFontSizeMultiplier={1.15} className="text-[15px] font-extrabold text-ink">Daily Care Plan</Text>
                <Text maxFontSizeMultiplier={1.15} className="text-[11.5px] text-muted leading-4">Set by the WonPet team. Switch off any you don't want; turn them back on anytime.</Text>
              </View>
            </View>
          </View>
          {dailyTasks.length === 0 && <Text className="text-xs text-muted px-4 py-4">No daily tasks for this pet yet.</Text>}
          {dailyTasks.map((t, i) => {
            const on = isDailyEnabled(petId, t.id);
            return (
              <View key={t.id} className={cn('flex-row items-center gap-3 px-4 py-3', i > 0 && 'border-t border-orange-50', !on && 'bg-cream/60')}>
                <TimePill time={t.time} />
                <View className="flex-1">
                  <Text maxFontSizeMultiplier={1.15} className={cn('text-[14px] font-bold', on ? 'text-ink' : 'text-muted line-through')} numberOfLines={1}>{t.title}</Text>
                  <Text maxFontSizeMultiplier={1.15} className="text-[11.5px] text-muted leading-4" numberOfLines={2}>{t.description}</Text>
                </View>
                <Switch
                  style={sw}
                  value={on}
                  trackColor={{ true: colors.primary, false: '#E2E8F0' }}
                  thumbColor="#fff"
                  accessibilityLabel={`${t.title} ${on ? 'on' : 'off'}`}
                  onValueChange={(v) => { setDailyEnabled(petId, t.id, v); toast.success(v ? 'Added back to schedule' : 'Removed from schedule'); }}
                />
              </View>
            );
          })}
        </View>

        {/* My tasks */}
        <View className={panel}>
          <View className={panelHead}>
            <View className="flex-row items-center gap-2.5 flex-1">
              <View className="w-9 h-9 rounded-full bg-primary-soft items-center justify-center"><Ionicons name="list-outline" size={18} color={colors.primary} /></View>
              <View className="flex-1">
                <Text maxFontSizeMultiplier={1.15} className="text-[15px] font-extrabold text-ink">My Tasks</Text>
                <Text maxFontSizeMultiplier={1.15} className="text-[11.5px] text-muted">One-off or repeating reminders</Text>
              </View>
            </View>
            {!formOpen && (
              <Pressable onPress={startAdd} accessibilityRole="button" accessibilityLabel="Add task" className="flex-row items-center gap-1 px-3.5 py-2 rounded-full bg-primary active:opacity-80">
                <Ionicons name="add" size={15} color="#fff" />
                <Text maxFontSizeMultiplier={1.1} className="text-xs font-bold text-white">Add Task</Text>
              </Pressable>
            )}
          </View>

          {formOpen && (
            <View className="px-4 py-4 gap-3.5 bg-orange-50/40 border-b border-orange-100">
              <Text maxFontSizeMultiplier={1.15} className="text-[15px] font-extrabold text-ink">{editingId ? 'Edit task' : 'New task'}</Text>

              <View>
                <Text className={label}>Title</Text>
                <TextInput value={form.title} onChangeText={(t) => set({ title: t })} placeholder="e.g. Give medicine" placeholderTextColor={colors.muted} className={input} />
              </View>
              <View>
                <Text className={label}>Description <Text className="font-normal text-muted">(optional)</Text></Text>
                <TextInput value={form.description} onChangeText={(t) => set({ description: t })} placeholder="Add a short note" placeholderTextColor={colors.muted} multiline className={cn(input, 'min-h-[60px]')} textAlignVertical="top" />
              </View>

              {showAdd && (
                <View>
                  <Text className={label}>How often?</Text>
                  <View className="flex-row bg-white border border-orange-200 rounded-xl p-1">
                    {[{ k: false, t: 'Just once', i: 'flash-outline' }, { k: true, t: 'Every day', i: 'repeat' }].map((o) => {
                      const active = form.repeatDaily === o.k;
                      return (
                        <Pressable key={o.t} onPress={() => set({ repeatDaily: o.k })} accessibilityRole="button" accessibilityState={{ selected: active }} className={cn('flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-lg', active ? 'bg-primary' : 'active:bg-cream')}>
                          <Ionicons name={o.i as any} size={14} color={active ? '#fff' : colors.muted} />
                          <Text maxFontSizeMultiplier={1.1} className={cn('text-[13px] font-bold', active ? 'text-white' : 'text-muted')}>{o.t}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <Text maxFontSizeMultiplier={1.15} className="text-[11px] text-muted mt-1.5 leading-4">
                    {form.repeatDaily ? 'A permanent task you can pause or remove later.' : 'Happens once, on the date below.'}
                  </Text>
                </View>
              )}

              {showAdd && <DateFields label={form.repeatDaily ? 'Start Date' : 'Date'} value={form.date} onChange={(d) => set({ date: d })} />}

              <View>
                <Text className={label}>Time</Text>
                <CustomDropdown value={form.time} placeholder="Select time" options={timeOptions} onChange={(v) => set({ time: v })} />
              </View>

              {(editingId || (showAdd && form.repeatDaily)) && (
                <DateFields label="End Date (optional)" value={form.endDate} onChange={(d) => set({ endDate: d })} min={form.date || undefined} hint="Leave blank to repeat until you pause or delete it." />
              )}

              <View className="flex-row gap-2.5 mt-1">
                <Button className="flex-1 py-3" variant="neutral" title="Cancel" onPress={cancelForm} />
                <Button className="flex-1 py-3" title={editingId ? 'Save Changes' : 'Create Task'} onPress={editingId ? update : create} />
              </View>
            </View>
          )}

          {myTasks.length === 0 && !formOpen ? (
            <View className="items-center gap-1.5 px-6 py-7">
              <View className="w-12 h-12 rounded-full bg-primary-soft items-center justify-center"><Ionicons name="alarm-outline" size={24} color={colors.primary} /></View>
              <Text className="text-[15px] font-bold text-ink">No tasks of your own yet</Text>
              <Text className="text-xs text-muted text-center leading-[18px]">Add a reminder like medicine, a walk or grooming and it will show on the dashboard.</Text>
            </View>
          ) : (
            myTasks.map((t, i) => {
              const paused = t.status === 'Paused';
              return (
                <View key={t.id} className={cn('flex-row items-center gap-3 px-4 py-3', i > 0 && 'border-t border-orange-50', paused && 'bg-cream/60')}>
                  <TimePill time={t.time} />
                  <View className="flex-1 gap-0.5">
                    <Text maxFontSizeMultiplier={1.15} className={cn('text-[14px] font-bold', paused ? 'text-muted' : 'text-ink')} numberOfLines={1}>{t.title}</Text>
                    {!!t.description && <Text maxFontSizeMultiplier={1.15} className="text-[11.5px] text-muted leading-4" numberOfLines={2}>{t.description}</Text>}
                    <View className="flex-row items-center gap-1.5 flex-wrap mt-0.5">
                      <View className="flex-row items-center gap-1 bg-blue-soft rounded-full px-2 py-0.5"><Ionicons name="repeat" size={10} color={colors.blue} /><Text className="text-[10px] font-bold text-blue">Daily</Text></View>
                      {!!t.endDate && <Text className="text-[10px] text-muted">Until {formatIsoDate(t.endDate)}</Text>}
                      {paused && <Text className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full overflow-hidden">Paused</Text>}
                    </View>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    <IconBtn icon={paused ? 'play' : 'pause'} tint={paused ? colors.green : '#D97706'} bg={paused ? 'bg-green-soft' : 'bg-amber-50'} label={paused ? 'Resume task' : 'Pause task'} onPress={() => updateOwnerTask(t.id, { status: paused ? 'Active' : 'Paused' })} />
                    <IconBtn icon="pencil" tint={colors.blue} bg="bg-blue-soft" label="Edit task" onPress={() => startEdit(t)} />
                    <IconBtn icon="trash-outline" tint={colors.red} bg="bg-red-soft" label="Delete task" onPress={() => remove(t.id, t.title)} />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}