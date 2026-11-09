import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Chip, Field, T } from '../../components/ui';
import { Panel as Card } from '../../components/doctor/DoctorUI';
import PetAvatar from '../../components/PetAvatar';
import { Avatar } from '../../components/Avatar';
import InfoGrid from '../../components/common/InfoField';
import BottomSheet from '../../components/common/BottomSheet';
import RescheduleSheet from '../../components/appointments/RescheduleSheet';
import { StatusPill, formatApptDate } from '../../components/appointments/AppointmentCard';
import { AppointmentDetailSkeleton } from '../../components/Skeletons';
import { toast } from '../../components/WonPetsAlert';
import { useRemote } from '../../hooks/useRemote';
import { useDoctorActions } from '../../hooks/useDoctorActions';
import { doctorService } from '../../services/doctor.service';
import { errorMessage } from '../../services/api';
import { useDoctor } from '../../context/DoctorContext';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { inr } from '../../utils/orders';

/** One appointment from the doctor's side: who, when, what - plus every action the status allows (accept → start → complete, notes, fee, prescription, record). */
export default function DoctorAppointmentScreen({ route, navigation }: any) {
  const id: string = route.params.id;
  const { tick } = useDoctor();
  const { user } = useAuth();
  const { startConversation } = useChat();
  const appt = useRemote(() => doctorService.appointment(id), [id], tick);
  const rx = useRemote(() => doctorService.prescriptionFor(id), [id], tick);
  const rec = useRemote(() => doctorService.recordFor(id), [id], tick);
  const reload = () => { appt.reloadQuiet(); rx.reloadQuiet(); rec.reloadQuiet(); };
  const act = useDoctorActions(reload);

  const [sheet, setSheet] = useState<'notes' | 'fee' | 'resched' | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [ai, setAi] = useState<{ checked: boolean; note?: string }>({ checked: false });

  const a = appt.data;
  useEffect(() => { navigation.setOptions({ title: a ? `${a.pet}'s visit` : 'Appointment' }); }, [a?.pet]);
  if (appt.loading && !a) return <AppointmentDetailSkeleton />;
  if (!a) return <View className="flex-1 bg-cream items-center justify-center p-6"><Text className={T.body}>{appt.error || 'Appointment not found.'}</Text></View>;

  const live = a.status === 'In Progress' || a.status === 'Completed';
  const rxData = rx.data, recData = rec.data;

  const openSheet = (s: 'notes' | 'fee') => { setDraft(s === 'notes' ? a.notes ?? '' : String(a.fee ?? '')); setSheet(s); };
  const save = async () => {
    setSaving(true);
    try {
      if (sheet === 'notes') await doctorService.saveNotes(a.id, draft.trim());
      else { const fee = Number(draft); if (!Number.isFinite(fee) || fee < 0) throw new Error('Enter a valid fee.'); await doctorService.setFee(a.id, fee); }
      toast.success(sheet === 'notes' ? 'Notes saved' : 'Fee updated');
      setSheet(null); appt.reloadQuiet();
    } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
  };
  const checkAi = async () => {
    try { const r = await doctorService.aiNote(a.id); setAi({ checked: true, note: r.ready ? r.note : undefined }); } catch (e) { toast.error(errorMessage(e)); }
  };
  const reschedule = async (patch: { isoDate: string; time: string }) => {
    try { await doctorService.reschedule(a.id, patch.isoDate, patch.time); toast.success('Appointment moved'); reload(); return true; } catch (e) { toast.error(errorMessage(e)); return false; }
  };
  const message = async () => {
    if (!a.ownerId) return;
    const cid = await startConversation('vet', a.ownerId);
    if (cid) navigation.navigate('ChatThread', { conversationId: cid });
  };
  const buttons = act.actionsFor(a, { reschedule: () => setSheet('resched') });

  return (
    <View className="flex-1 bg-cream">
      <ScrollView contentContainerClassName="p-4 gap-3.5 pb-32" refreshControl={<RefreshControl refreshing={appt.refreshing} onRefresh={() => { appt.reload(); rx.reloadQuiet(); rec.reloadQuiet(); }} tintColor={colors.primary} />}>
        {/* pet + status */}
        <Card className="gap-3">
          <View className="flex-row items-center gap-3.5">
            <PetAvatar emoji={a.emoji} image={a.petImage} size={64} />
            <View className="flex-1 gap-0.5">
              <Text className={T.h1} numberOfLines={1}>{a.pet}</Text>
              <Text className={T.body} numberOfLines={1}>{[a.breed, a.age, a.petGender].filter(Boolean).join(' · ') || 'Patient'}</Text>
              {!!a.appointmentNo && <Text className={T.small}>#{a.appointmentNo}</Text>}
            </View>
          </View>
          <View className="flex-row items-center gap-2 flex-wrap">
            <StatusPill status={a.status} size="md" />
            <Chip label={a.mode} tone={a.mode === 'Emergency' ? 'red' : 'blue'} />
            {!!a.visitType && <Chip label={a.visitType} tone="purple" />}
          </View>
          {!!a.petId && <Pressable onPress={() => navigation.navigate('PatientDetail', { petId: a.petId })} className="flex-row items-center gap-1.5 self-start active:opacity-70"><Ionicons name="paw" size={14} color={colors.primary} /><Text className="text-primary font-bold text-[13px]">Open patient history</Text></Pressable>}
        </Card>

        {/* owner */}
        <Card className="gap-3">
          <View className="flex-row items-center gap-3">
            <Avatar image={a.ownerImage} emoji="🙂" size={46} />
            <View className="flex-1"><Text className="text-[10px] font-bold text-primary uppercase">Pet owner</Text><Text className={T.h3} numberOfLines={1}>{a.owner ?? '—'}</Text>{!!a.ownerPhone && <Text className={T.small}>{a.ownerPhone}</Text>}</View>
          </View>
          <View className="flex-row gap-2">
            {!!a.ownerPhone && <Button title="Call" variant="outline" className="flex-1 py-2.5" icon={<Ionicons name="call-outline" size={16} color={colors.primary} />} onPress={() => Linking.openURL(`tel:${a.ownerPhone}`)} />}
            {!!a.ownerId && <Button title="Message" variant="outline" className="flex-1 py-2.5" icon={<Ionicons name="chatbubble-outline" size={16} color={colors.primary} />} onPress={message} />}
          </View>
        </Card>

        {/* visit */}
        <Card className="gap-3">
          <Text className={T.h2}>Visit details</Text>
          <InfoGrid items={[['Date', formatApptDate(a)], ['Time', a.time], ['Mode', a.mode], ['Payment', a.paymentStatus]]} />
          <View className="flex-row items-center justify-between pt-3 border-t border-line">
            <View><Text className="text-[10px] text-muted uppercase">Consultation fee</Text><Text className="text-lg font-black text-ink">{a.fee != null ? inr(a.fee) : '—'}</Text></View>
            {live && <Button title="Edit fee" variant="neutral" className="py-2 px-4" onPress={() => openSheet('fee')} />}
          </View>
          {!!a.reason && <View className="bg-cream rounded-2xl p-3.5"><Text className="text-[10px] font-bold text-muted uppercase mb-1">Reason for visit</Text><Text className="text-sm text-ink leading-5">{a.reason}</Text></View>}
          {!!a.homeAddress && (
            <View className="bg-primary-soft rounded-2xl p-3.5 gap-2">
              <Text className="text-[10px] font-bold text-primary uppercase">Home visit address</Text><Text className="text-sm text-ink leading-5">{a.homeAddress}</Text>
              {!!a.mapUrl && <Pressable onPress={() => Linking.openURL(a.mapUrl!)} className="flex-row items-center gap-1.5 self-start"><Ionicons name="navigate" size={15} color={colors.primary} /><Text className="text-primary font-bold text-[13px]">Open in Maps</Text></Pressable>}
            </View>
          )}
        </Card>

        {!!a.attachments?.length && (
          <Card className="gap-3">
            <Text className={T.h2}>Attachments from the owner</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2.5">
              {a.attachments.map((u, i) => (
                <Pressable key={u + i} onPress={() => Linking.openURL(u)} className="w-[84px] h-[84px] rounded-2xl overflow-hidden bg-primary-soft items-center justify-center border border-line">
                  {/\.(png|jpe?g|webp|gif)(\?|$)/i.test(u) ? <Image source={{ uri: u }} style={{ width: 84, height: 84 }} /> : <Ionicons name="document-text-outline" size={28} color={colors.primary} />}
                </Pressable>
              ))}
            </ScrollView>
          </Card>
        )}

        {/* notes */}
        <Card className="gap-2.5">
          <View className="flex-row items-center justify-between"><Text className={T.h2}>Consultation notes</Text>{live && <Pressable onPress={() => openSheet('notes')} className="flex-row items-center gap-1"><Ionicons name="create-outline" size={16} color={colors.primary} /><Text className="text-primary font-bold text-[13px]">{a.notes ? 'Edit' : 'Add'}</Text></Pressable>}</View>
          <Text className="text-sm text-ink leading-5">{a.notes || (live ? 'No notes yet.' : 'Notes can be added once the consultation starts.')}</Text>
          {a.mode === 'Online' && live && (
            <View className="mt-1 pt-3 border-t border-line gap-2">
              <View className="flex-row items-center justify-between"><Text className="text-[13px] font-bold text-ink">AI note from the call</Text><Pressable onPress={checkAi}><Text className="text-primary font-bold text-[13px]">{ai.checked ? 'Check again' : 'Check now'}</Text></Pressable></View>
              {ai.note ? (<><Text className="text-sm text-ink leading-5">{ai.note}</Text><Button title="Use as my notes" variant="outline" className="py-2.5" onPress={() => { setDraft(ai.note!); setSheet('notes'); }} /></>)
                : <Text className={T.small}>{ai.checked ? "The transcript isn't ready yet - try again in a moment." : a.aiNote ? a.aiNote : 'Generated from the call transcript after the call ends.'}</Text>}
            </View>
          )}
        </Card>

        {/* prescription + record */}
        <Card className="gap-3">
          <View className="flex-row items-center justify-between"><View className="flex-row items-center gap-2"><View className="w-9 h-9 rounded-xl bg-purple-soft items-center justify-center"><Ionicons name="medical" size={17} color={colors.purple} /></View><Text className={T.h2}>Prescription</Text></View>{!!rxData && <Chip label={`${rxData.medicines.length} medicine${rxData.medicines.length === 1 ? '' : 's'}`} tone="purple" />}</View>
          {rxData ? (<>
            <Text className="text-sm text-ink" numberOfLines={2}>{rxData.diagnosis}</Text>
            <View className="flex-row gap-2"><Button title="View" variant="outline" className="flex-1 py-2.5" onPress={() => navigation.navigate('PrescriptionView', { appointmentId: a.id })} /><Button title="Edit" variant="neutral" className="flex-1 py-2.5" onPress={() => navigation.navigate('PrescriptionForm', { appointmentId: a.id })} /></View>
          </>) : a.status === 'In Progress' ? <Button title="Write prescription" icon={<Ionicons name="add" size={18} color="#fff" />} onPress={() => navigation.navigate('PrescriptionForm', { appointmentId: a.id })} />
            : <Text className={T.small}>{a.status === 'Completed' ? 'No prescription was issued for this visit.' : 'Available once the consultation is in progress.'}</Text>}
        </Card>

        <Card className="gap-3">
          <View className="flex-row items-center gap-2"><View className="w-9 h-9 rounded-xl bg-green-soft items-center justify-center"><Ionicons name="clipboard" size={17} color={colors.green} /></View><Text className={T.h2}>Medical record</Text></View>
          {recData && (recData.diagnosis || recData.treatment) ? <Text className="text-sm text-ink" numberOfLines={2}>{recData.diagnosis || recData.treatment}</Text> : null}
          {live ? <Button title={recData && (recData.diagnosis || recData.treatment) ? 'Edit record' : 'Add medical record'} variant={recData ? 'neutral' : 'outline'} onPress={() => navigation.navigate('MedicalRecordForm', { appointmentId: a.id })} />
            : <Text className={T.small}>Available once the consultation starts.</Text>}
        </Card>
      </ScrollView>

      {buttons.length > 0 && (
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-line px-4 pt-3 pb-7 flex-row gap-2.5">
          {buttons.map((b) => <Button key={b.label} title={b.label} variant={b.solid ? 'primary' : b.danger ? 'danger' : 'neutral'} className="flex-1 py-3" disabled={act.busyId === a.id} onPress={b.onPress} icon={<Ionicons name={b.icon} size={17} color={b.solid || b.danger ? '#fff' : colors.text} />} />)}
        </View>
      )}

      <BottomSheet visible={sheet === 'notes' || sheet === 'fee'} onClose={() => setSheet(null)} title={sheet === 'fee' ? 'Consultation fee' : 'Consultation notes'} subtitle={sheet === 'fee' ? 'Amount charged for this visit' : 'Visible in the pet’s medical history'}
        footer={<Button title={saving ? 'Saving…' : 'Save'} disabled={saving} onPress={save} />}>
        {sheet === 'fee'
          ? <Field value={draft} onChangeText={setDraft} keyboardType="numeric" placeholder="e.g. 500" />
          : <Field value={draft} onChangeText={setDraft} multiline placeholder="Findings, treatment given, advice…" style={{ minHeight: 140, textAlignVertical: 'top' }} />}
      </BottomSheet>
      {sheet === 'resched' && <RescheduleSheet visible viewer="doctor" appointment={{ ...a, doctorId: user?.id }} onClose={() => setSheet(null)} onConfirm={reschedule} />}
    </View>
  );
}
