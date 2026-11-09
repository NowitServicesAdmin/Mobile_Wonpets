import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Chip, T, Tone, cn } from '../ui';
import DateFields from '../DateFields';
import { Avatar } from '../Avatar';
import PetChips from './PetChips';
import { WonPetsAlert, toast } from '../WonPetsAlert';
import { Collaborator, DirectoryUser, collabIsExpired } from '../../data/settings';
import { settingsService } from '../../services/settings.service';
import { errorMessage } from '../../services/api';
import { useSettings } from '../../context/SettingsContext';
import { usePets } from '../../context/PetsContext';
import { formatIsoDate, todayInputValue } from '../../utils/petAge';

const tone: Record<string, Tone> = { pending: 'yellow', accepted: 'green', declined: 'white', revoked: 'red', expired: 'white' };
const statusOf = (c: Collaborator) => (c.status === 'accepted' && collabIsExpired(c) ? 'expired' : c.status);

/** Add / edit what a collaborator can see: which pets, and for which dates. */
function CollaboratorSheet({ visible, editing, onClose }: { visible: boolean; editing: Collaborator | null; onClose: () => void }) {
  const { pets } = usePets();
  const { addCollaborator, updateCollaborator } = useSettings();
  const [q, setQ] = useState('');
  const [user, setUser] = useState<DirectoryUser | null>(null);
  const [petIds, setPetIds] = useState<string[]>([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [hits, setHits] = useState<DirectoryUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (visible) { setQ(''); setUser(null); setPetIds(editing?.petIds ?? []); setStart(editing?.startDate ?? ''); setEnd(editing?.endDate ?? ''); } }, [visible, editing]);

  // live user search (debounced)
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits([]); return; }
    setSearching(true);
    const t = setTimeout(() => { settingsService.searchUsers(term).then(setHits).catch(() => setHits([])).finally(() => setSearching(false)); }, 350);
    return () => clearTimeout(t);
  }, [q]);
  const toggle = (id: string) => setPetIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const submit = async () => {
    if (!editing && !user) return toast.error('Select a user to invite');
    if (!petIds.length) return toast.error('Select at least one pet');
    if (!start || !end) return toast.error('Select a start and end date for their access');
    if (end < start) return toast.error('End date must be on or after the start date');
    setSaving(true);
    try {
      if (editing) { await updateCollaborator(editing.id, { petIds, startDate: start, endDate: end }); toast.success('Access updated'); }
      else { await addCollaborator({ userId: user!.id, petIds, startDate: start, endDate: end }); toast.success('Invitation sent'); }
      onClose();
    } catch (e) { toast.error(errorMessage(e)); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-[28px] max-h-[90%]">
          <View className="flex-row justify-between items-center px-5 pt-5 pb-2"><View className="flex-1"><Text className={T.h2}>{editing ? `Edit access · ${editing.name}` : 'Add collaborator'}</Text><Text className={T.small}>Give someone limited access to your pets.</Text></View><Pressable onPress={onClose}><Ionicons name="close" size={24} color={colors.text} /></Pressable></View>
          <ScrollView contentContainerClassName="px-5 pb-6 gap-4" keyboardShouldPersistTaps="handled">
            {!editing && (
              <View className="gap-2">
                <Text className="font-bold text-ink">Find a user</Text>
                {user ? (
                  <View className="flex-row items-center gap-3 rounded-2xl border border-primary bg-primary-soft/60 p-3"><Avatar image={user.photo} emoji={user.emoji} size={40} /><View className="flex-1"><Text className={T.h3}>{user.name}</Text><Text className={T.small}>{user.email}</Text></View>{!!user.role && user.role !== 'user' && <Chip label={user.role.charAt(0).toUpperCase() + user.role.slice(1)} tone="orange" />}<Pressable onPress={() => setUser(null)}><Ionicons name="close-circle" size={20} color={colors.muted} /></Pressable></View>
                ) : (
                  <>
                    <View className="flex-row items-center gap-2 border-[1.5px] border-line rounded-2xl px-3"><Ionicons name="search-outline" size={17} color={colors.muted} /><TextInput value={q} onChangeText={setQ} placeholder="Search by name, email or phone" placeholderTextColor="#B8AEA5" autoCapitalize="none" className="flex-1 py-3" /></View>
                    {hits.map((u) => <Pressable key={u.id} onPress={() => setUser(u)} className="flex-row items-center gap-3 rounded-2xl border border-line p-3 active:bg-cream"><Avatar image={u.photo} emoji={u.emoji} size={40} /><View className="flex-1"><Text className={T.h3}>{u.name}</Text><Text className={T.small}>{u.email} · {u.phone}</Text></View>{!!u.role && u.role !== 'user' && <Chip label={u.role.charAt(0).toUpperCase() + u.role.slice(1)} tone="orange" />}</Pressable>)}
                    {searching && <Text className={T.small}>Searching…</Text>}
                    {!searching && q.trim().length >= 2 && hits.length === 0 && <Text className={T.small}>No users found.</Text>}
                  </>
                )}
              </View>
            )}
            <View className="gap-2">
              <Text className="font-bold text-ink">Pets they can access <Text className="text-red">*</Text></Text>
              {pets.length === 0 ? <Text className={T.small}>Add a pet first.</Text> : (
                <View className="flex-row flex-wrap gap-2">
                  {pets.map((p) => {
                    const on = petIds.includes(p.id);
                    return (
                      <Pressable key={p.id} onPress={() => toggle(p.id)} className={cn('flex-row items-center gap-2 rounded-full border-[1.5px] pl-1 pr-3 py-1', on ? 'border-primary bg-primary-soft' : 'border-line bg-white')}>
                        <Avatar image={p.image} emoji={p.emoji} size={28} />
                        <Text className={cn('text-[13px] font-semibold', on ? 'text-primary' : 'text-ink')}>{p.name}</Text>
                        {on && <Ionicons name="checkmark-circle" size={16} color={colors.primary} />}
                      </Pressable>
                    );
                  })}
                </View>
              )}
              {pets.length > 0 && petIds.length === 0 && <Text className="text-xs text-red">Select at least one pet.</Text>}
            </View>
            <View className="rounded-2xl border border-orange-100 bg-primary-soft/50 p-3.5"><Text className="text-sm font-bold text-ink">Full access included</Text><Text className={T.small + ' mt-1'}>Once accepted, your collaborator can view the selected pets' details, appointments, prescriptions, medical records and orders.</Text></View>
            <View className="gap-3"><Text className="font-bold text-ink">Access period</Text><DateFields label="Start date" value={start} onChange={setStart} min={editing ? undefined : todayInputValue()} /><DateFields label="End date" value={end} onChange={setEnd} min={start || undefined} /></View>
            <Button disabled={saving} title={saving ? 'Saving…' : editing ? 'Save changes' : 'Send invitation'} onPress={submit} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function CollaboratorsSection() {
  const { collaborators, revokeCollaborator } = useSettings();
  const { pets } = usePets();
  const [sheet, setSheet] = useState<{ open: boolean; editing: Collaborator | null }>({ open: false, editing: null });

  const revoke = async (c: Collaborator) => {
    const r = await WonPetsAlert.delete('Revoke access?', `Revoke ${c.name}'s access to your pets?`, { confirmText: 'Revoke' });
    if (!r.isConfirmed) return;
    try { await revokeCollaborator(c.id); toast.success('Access revoked'); } catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between gap-3"><Text className={T.body + ' flex-1'}>Give trusted people limited access to your pets' info.</Text><Button className="py-2.5 px-4" title="Add" icon={<Ionicons name="person-add" size={15} color="#fff" />} onPress={() => setSheet({ open: true, editing: null })} /></View>
      {collaborators.length === 0 && <View className="items-center py-5 gap-1"><Ionicons name="people-outline" size={34} color="#D6CCC2" /><Text className={T.h3}>No collaborators yet</Text><Text className={T.small + ' text-center'}>Add someone you trust to share selected pet information.</Text></View>}
      {collaborators.map((c) => {
        const st = statusOf(c); const manageable = st === 'pending' || st === 'accepted';
        return (
          <View key={c.id} className="rounded-2xl border border-line bg-white p-3.5 gap-2.5">
            <View className="flex-row items-center gap-3"><Avatar image={c.photo} emoji={c.emoji} size={44} /><View className="flex-1"><Text className={T.h3}>{c.name}</Text><Text className={T.small}>{c.contact}</Text></View><Chip label={st[0].toUpperCase() + st.slice(1)} tone={tone[st]} /></View>
            <PetChips pets={c.pets.map((sp) => { const mine = pets.find((x) => x.id === sp.id); return mine ? { id: mine.id, name: mine.name, emoji: mine.emoji, image: mine.image } : sp; })} />
            <View className="flex-row items-center gap-1.5"><Ionicons name="calendar-outline" size={13} color={colors.muted} /><Text className={T.small}>{formatIsoDate(c.startDate)} – {formatIsoDate(c.endDate)}</Text></View>
            {manageable && (
              <View className="flex-row gap-2.5">
                {st === 'pending' && <Button className="flex-1 py-2.5" variant="outline" title="Edit access" onPress={() => setSheet({ open: true, editing: c })} />}
                <Button className="flex-1 py-2.5" variant="neutral" title={st === 'pending' ? 'Cancel invite' : 'Revoke'} onPress={() => revoke(c)} />
              </View>
            )}
          </View>
        );
      })}
      <CollaboratorSheet visible={sheet.open} editing={sheet.editing} onClose={() => setSheet({ open: false, editing: null })} />
    </View>
  );
}