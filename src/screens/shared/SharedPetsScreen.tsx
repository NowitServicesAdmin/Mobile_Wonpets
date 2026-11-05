import { useLiveSync } from '../../context/LiveSyncContext';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Card, Chip, Empty, T, cn } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import { WonPetsAlert, toast } from '../../components/WonPetsAlert';
import { useAuth } from '../../context/AuthContext';
import { useManaged } from '../../context/ManagedContext';
import { errorMessage } from '../../services/api';
import { SharedNote, SharedPet, SharedPrescription, SharedVaccination, managedService } from '../../services/managed.service';
import { formatIsoDate } from '../../utils/petAge';

type Detail = { vaccinations: SharedVaccination[]; prescription: SharedPrescription | null; nextVisit: string | null; healthBadge?: string };
type IconName = keyof typeof Ionicons.glyphMap;
type TabKey = 'health' | 'notes' | 'owner';

function Block({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2"><Ionicons name={icon} size={16} color={colors.primary} /><Text className="font-extrabold text-ink">{title}</Text></View>
      {children}
    </View>
  );
}

function Tile({ icon, tint, bg, label, value }: { icon: IconName; tint: string; bg: string; label: string; value: string }) {
  return (
    <View className={cn('flex-1 rounded-2xl p-2.5 gap-1.5', bg)}>
      <Ionicons name={icon} size={16} color={tint} />
      <Text numberOfLines={1} className="text-[10.5px] font-semibold text-muted">{label}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} className="text-[13px] font-extrabold text-ink">{value}</Text>
    </View>
  );
}

function Segmented({ value, onChange }: { value: TabKey; onChange: (v: TabKey) => void }) {
  const items: { k: TabKey; label: string; icon: IconName }[] = [
    { k: 'health', label: 'Health', icon: 'heart-outline' },
    { k: 'notes', label: 'Notes', icon: 'create-outline' },
    { k: 'owner', label: 'Owner', icon: 'person-outline' },
  ];
  return (
    <View className="flex-row bg-primary-soft rounded-2xl p-1">
      {items.map((i) => {
        const on = value === i.k;
        return (
          <Pressable key={i.k} onPress={() => onChange(i.k)} accessibilityRole="button" accessibilityState={{ selected: on }} className={cn('flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2', on && 'bg-white')}>
            <Ionicons name={i.icon} size={14} color={on ? colors.primary : colors.muted} />
            <Text className={cn('text-xs font-extrabold', on ? 'text-primary' : 'text-muted')}>{i.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Caretaker notes: add one, keep it private or share it with the owner, delete your own. */
function NotesBlock({ pet }: { pet: SharedPet }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<SharedNote[] | null>(null);
  const [text, setText] = useState('');
  const [share, setShare] = useState(false);
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => managedService.notes(pet.id, pet.ownerId, user?.id ?? '').then(setNotes).catch(() => setNotes([])), [pet.id, pet.ownerId, user?.id]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!text.trim()) return toast.error('Write a note first');
    setSaving(true);
    try { await managedService.addNote(pet.id, pet.ownerId, text.trim(), share); setText(''); setShare(false); await load(); toast.success(share ? 'Note shared with the owner' : 'Private note saved'); }
    catch (e) { toast.error(errorMessage(e)); }
    finally { setSaving(false); }
  };
  const toggle = async (n: SharedNote) => {
    try { await managedService.setNoteShared(n.id, pet.ownerId, !n.shared); await load(); toast.success(n.shared ? 'Note is now private' : 'Note shared with the owner'); }
    catch (e) { toast.error(errorMessage(e)); }
  };
  const remove = async (n: SharedNote) => {
    const r = await WonPetsAlert.delete('Delete note?', 'This note will be removed.', { confirmText: 'Yes, delete' });
    if (!r.isConfirmed) return;
    try { await managedService.deleteNote(n.id, pet.ownerId); await load(); toast.success('Note deleted'); }
    catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <View className="gap-3">
      <View className="gap-2 rounded-2xl border border-line bg-cream p-3">
        <TextInput value={text} onChangeText={setText} multiline placeholder={`Add a note about ${pet.name}…`} placeholderTextColor="#B8AEA5" className="min-h-[64px] text-sm text-ink" textAlignVertical="top" />
        <View className="flex-row items-center justify-between gap-2 pt-2 border-t border-line">
          <Pressable onPress={() => setShare((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: share }} className="flex-row items-center gap-1.5 flex-1">
            <Ionicons name={share ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
            <Text className="text-xs text-ink flex-1" numberOfLines={1}>Share with {pet.ownerName}</Text>
          </Pressable>
          <Button className="px-4 py-2" title={saving ? 'Saving…' : 'Add note'} onPress={add} disabled={saving} />
        </View>
      </View>

      {notes === null && <ActivityIndicator color={colors.primary} />}
      {notes?.length === 0 && (
        <View className="items-center py-3"><Text className="text-2xl mb-1">📝</Text><Text className={T.small}>No notes yet.</Text></View>
      )}
      {notes?.map((n) => (
        <View key={n.id} className="rounded-2xl bg-yellow-soft/60 border border-yellow/20 p-3 gap-2">
          <Text className="text-sm text-ink leading-5">{n.text}</Text>
          <View className="flex-row items-center gap-2">
            <Text className={cn(T.small, 'flex-1')} numberOfLines={1}>{n.mine ? 'You' : n.authorName} · {formatIsoDate(n.createdAt)}</Text>
            {n.mine && (
              <>
                <Pressable onPress={() => toggle(n)} hitSlop={6} accessibilityRole="button"><Chip label={n.shared ? 'Shared · make private' : 'Private · share'} tone={n.shared ? 'green' : 'white'} /></Pressable>
                <Pressable onPress={() => remove(n)} hitSlop={8} accessibilityLabel="Delete note"><Ionicons name="trash-outline" size={17} color={colors.red} /></Pressable>
              </>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

function HealthTab({ d }: { d: Detail }) {
  const rx = d.prescription;
  const nextDue = d.vaccinations.map((v) => v.nextDue).filter(Boolean).sort()[0];
  return (
    <View className="gap-4">
      <View className="flex-row gap-2">
        <Tile icon="calendar-outline" tint={colors.blue} bg="bg-blue-soft" label="Next visit" value={d.nextVisit ? formatIsoDate(d.nextVisit) : 'None'} />
        <Tile icon="shield-checkmark-outline" tint={colors.green} bg="bg-green-soft" label="Vaccines" value={`${d.vaccinations.length} on record`} />
        <Tile icon="heart-outline" tint={d.healthBadge && d.healthBadge !== 'Healthy' ? colors.red : colors.primary} bg={d.healthBadge && d.healthBadge !== 'Healthy' ? 'bg-red-soft' : 'bg-primary-soft'} label="Health" value={d.healthBadge || '—'} />
      </View>

      <Block icon="document-text-outline" title="Latest prescription">
        {!rx ? <Text className={T.body}>No prescription yet.</Text> : (
          <View className="rounded-2xl bg-purple-soft/40 border border-purple/20 p-3 gap-1.5">
            {!!rx.diagnosis && <Text className={T.h3}>{rx.diagnosis}</Text>}
            <Text className={T.small}>{rx.doctorName ? `By ${rx.doctorName}` : ''}{rx.createdAt ? ` · ${formatIsoDate(rx.createdAt)}` : ''}</Text>
            {rx.medicines.map((m, i) => (
              <View key={i} className="flex-row items-start gap-2 mt-1 bg-white rounded-xl border border-line p-2.5">
                <View className="w-7 h-7 rounded-lg bg-purple-soft items-center justify-center"><Ionicons name="medical-outline" size={14} color={colors.purple} /></View>
                <Text className="flex-1 text-[13px] text-ink leading-[18px]"><Text className="font-extrabold">{m.name}</Text> · {m.dosage} · {m.frequency} · {m.duration}{m.notes ? ` (${m.notes})` : ''}</Text>
              </View>
            ))}
            {!!rx.instructions && <Text className={cn(T.body, 'mt-1')}>{rx.instructions}</Text>}
            {!!rx.followUpDate && <Chip label={`Follow-up ${formatIsoDate(rx.followUpDate)}`} tone="purple" />}
          </View>
        )}
      </Block>

      <Block icon="shield-checkmark-outline" title="Vaccinations">
        {d.vaccinations.length === 0 && <Text className={T.body}>No vaccination records.</Text>}
        {!!nextDue && d.vaccinations.length > 0 && <Text className={T.small}>Next due {formatIsoDate(nextDue)}</Text>}
        {d.vaccinations.map((v) => (
          <View key={v.id} className="flex-row items-center gap-2.5 rounded-xl border border-line bg-white p-2.5">
            <View className="w-8 h-8 rounded-full bg-green-soft items-center justify-center"><Ionicons name="checkmark" size={16} color={colors.green} /></View>
            <View className="flex-1"><Text className={T.h3}>{v.name}</Text><Text className={T.small}>Given {v.givenOn ? formatIsoDate(v.givenOn) : '—'}{v.vet ? ` · ${v.vet}` : ''}</Text></View>
            {!!v.nextDue && <Chip label={`Due ${formatIsoDate(v.nextDue)}`} tone="yellow" />}
          </View>
        ))}
      </Block>
    </View>
  );
}

function OwnerTab({ pet }: { pet: SharedPet }) {
  const hasContact = !!(pet.ownerPhone || pet.ownerEmail);
  return (
    <View className="gap-3">
      <View className="flex-row items-center gap-3 rounded-2xl bg-cream border border-line p-3">
        <View className="w-11 h-11 rounded-full bg-primary-soft items-center justify-center"><Ionicons name="person" size={20} color={colors.primary} /></View>
        <View className="flex-1"><Text numberOfLines={1} className={T.h3}>{pet.ownerName}</Text><Text className={T.small}>Pet owner</Text></View>
      </View>
      {hasContact && (
        <View className="flex-row gap-2">
          {!!pet.ownerPhone && (
            <Pressable onPress={() => Linking.openURL(`tel:${pet.ownerPhone}`)} accessibilityRole="button" accessibilityLabel="Call owner" className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-primary py-3 active:opacity-80">
              <Ionicons name="call" size={16} color="#fff" /><Text className="text-white font-extrabold text-[13px]">Call</Text>
            </Pressable>
          )}
          {!!pet.ownerEmail && (
            <Pressable onPress={() => Linking.openURL(`mailto:${pet.ownerEmail}`)} accessibilityRole="button" accessibilityLabel="Email owner" className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border-[1.5px] border-primary bg-white py-3 active:opacity-80">
              <Ionicons name="mail-outline" size={16} color={colors.primary} /><Text className="text-primary font-extrabold text-[13px]">Email</Text>
            </Pressable>
          )}
        </View>
      )}
      {!!pet.ownerPhone && <View className="flex-row items-center gap-2"><Ionicons name="call-outline" size={15} color={colors.muted} /><Text className="text-sm text-ink">{pet.ownerPhone}</Text></View>}
      {!!pet.ownerEmail && <View className="flex-row items-center gap-2"><Ionicons name="mail-outline" size={15} color={colors.muted} /><Text className="flex-1 text-sm text-ink">{pet.ownerEmail}</Text></View>}
      {!!pet.ownerAddress && <View className="flex-row items-start gap-2"><Ionicons name="location-outline" size={15} color={colors.muted} style={{ marginTop: 2 }} /><Text className="flex-1 text-sm text-ink leading-5">{pet.ownerAddress}</Text></View>}
      {!hasContact && !pet.ownerAddress && <Text className={T.body}>The owner has not shared contact details.</Text>}
    </View>
  );
}

function PetDetail({ pet }: { pet: SharedPet }) {
  const [d, setD] = useState<Detail | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<TabKey>('health');

  useEffect(() => {
    let off = false;
    Promise.all([managedService.vaccinations(pet.id, pet.ownerId).catch(() => []), managedService.petDetail(pet.id, pet.ownerId)])
      .then(([vaccinations, detail]) => { if (!off) setD({ vaccinations, ...detail }); })
      .catch(() => { if (!off) setFailed(true); });
    return () => { off = true; };
  }, [pet.id, pet.ownerId]);

  if (failed) return <Text className={cn(T.small, 'pt-3')}>Could not load details. Pull down to refresh and try again.</Text>;
  if (!d) return <View className="py-6"><ActivityIndicator color={colors.primary} /></View>;

  return (
    <View className="gap-4 pt-4 mt-4 border-t border-line">
      <Segmented value={tab} onChange={setTab} />
      {tab === 'health' && <HealthTab d={d} />}
      {tab === 'notes' && <NotesBlock pet={pet} />}
      {tab === 'owner' && <OwnerTab pet={pet} />}
    </View>
  );
}

/** Every pet shared with you; tap one to see health records, notes and owner contact. */
export default function SharedPetsScreen() {
  const { accounts } = useManaged();
  const [pets, setPets] = useState<SharedPet[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [owner, setOwner] = useState<string>('all');
  const [nonce, setNonce] = useState(0); // bumping it re-mounts the open detail so a pull-to-refresh reloads it too

  const load = useCallback(async () => {
    setLoading(true);
    setPets(await managedService.pets(accounts));
    setNonce((n) => n + 1);
    setLoading(false);
  }, [accounts]);
  useEffect(() => { load(); }, [load]);
  // live sync: quietly refresh the list (no skeleton, open detail keeps its state)
  const { tick } = useLiveSync();
  useEffect(() => {
    if (!tick) return;
    managedService.pets(accounts).then(setPets).catch(() => {});
  }, [tick]);

  const owners = useMemo(() => {
    const m = new Map<string, string>();
    pets.forEach((p) => m.set(p.ownerId, p.ownerName));
    return Array.from(m, ([id, name]) => ({ id, name }));
  }, [pets]);
  const shown = owner === 'all' ? pets : pets.filter((p) => p.ownerId === owner);

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="p-4 gap-3 pb-10" refreshControl={<RefreshControl refreshing={loading && pets.length > 0} onRefresh={load} tintColor={colors.primary} />}>
      {loading && pets.length === 0 ? (
        <View className="py-16 items-center"><ActivityIndicator color={colors.primary} /></View>
      ) : pets.length === 0 ? (
        <Card><Empty emoji="🐾" title="No shared pets" body="Pets that owners share with you will appear here." /></Card>
      ) : (
        <>
          <View className="flex-row items-end justify-between">
            <View>
              <Text className={T.h1}>Shared pets</Text>
              <Text className={T.small}>{pets.length} {pets.length === 1 ? 'pet' : 'pets'} · {owners.length} {owners.length === 1 ? 'owner' : 'owners'}</Text>
            </View>
          </View>

          {owners.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pb-1">
              <Chip label="All owners" active={owner === 'all'} onPress={() => setOwner('all')} className="py-2 px-4" />
              {owners.map((o) => <Chip key={o.id} label={o.name} active={owner === o.id} onPress={() => setOwner(o.id)} tone="white" className="py-2 px-4 border border-line" />)}
            </ScrollView>
          )}

          {shown.map((p) => {
            const open = openId === p.id;
            return (
              <Card key={p.id} className={cn('p-3.5', open ? 'border-primary' : 'border-line')}>
                <Pressable onPress={() => setOpenId(open ? null : p.id)} accessibilityRole="button" accessibilityLabel={p.name} accessibilityState={{ expanded: open }} className="flex-row items-center gap-3.5 active:opacity-80">
                  <View className="rounded-full p-[3px] bg-orange-200"><View className="rounded-full bg-white p-0.5"><Avatar image={p.image} emoji={p.emoji} size={60} /></View></View>
                  <View className="flex-1 gap-1">
                    <View className="flex-row items-center gap-2">
                      <Text numberOfLines={1} className={cn(T.h2, 'flex-shrink')}>{p.name}</Text>
                      {p.isMissing && <Chip label="Missing" tone="red" />}
                    </View>
                    <Text numberOfLines={1} className={T.small}>{[p.breed, p.gender].filter(Boolean).join(' · ')}</Text>
                    <View className="flex-row flex-wrap gap-1.5">
                      {!!p.age && <Chip label={p.age} tone="orange" className="px-2 py-0.5" />}
                      {!!p.weight && <Chip label={p.weight} tone="blue" className="px-2 py-0.5" />}
                    </View>
                    <View className="flex-row items-center gap-1 mt-0.5"><Ionicons name="person-outline" size={11} color={colors.muted} /><Text numberOfLines={1} className={cn(T.small, 'flex-1')}>{p.ownerName}</Text></View>
                  </View>
                  <View className={cn('w-8 h-8 rounded-full items-center justify-center', open ? 'bg-primary' : 'bg-primary-soft')}>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={open ? '#fff' : colors.primary} />
                  </View>
                </Pressable>
                {open && <PetDetail key={`${p.id}-${nonce}`} pet={p} />}
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}