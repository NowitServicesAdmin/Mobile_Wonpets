import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Card, Chip, Empty, Field, T, cn } from '../../components/ui';
import { PetProfileSkeleton } from '../../components/Skeletons';
import PetAvatar from '../../components/PetAvatar';
import { WonPetsAlert, toast } from '../../components/WonPetsAlert';
import QRCodeCard from '../../components/pet/QRCodeCard';
import { AppointmentsCard, MedicalRecordsCard, NotesCard, PrescriptionCard, StatsGrid, VaccinationsCard } from '../../components/pet/PetSections';
import { usePets } from '../../context/PetsContext';
import type { MedicalRecord, PetNote, Prescription, Vaccination } from '../../data/petRecords';
import { isoToDDMM } from '../../services/mappers';
import { petRecordsService, PetDetail } from '../../services/petRecords.service';
import { getPetAgeLabel } from '../../utils/petAge';

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  const v = Math.min(Math.max(value, 0), 100);
  return (
    <View className="flex-1 bg-white rounded-2xl border border-line px-3 py-2.5" accessible accessibilityLabel={`${label} ${v} percent`}>
      <View className="flex-row items-baseline justify-between">
        <Text maxFontSizeMultiplier={1.1} className="text-xs text-muted">{label}</Text>
        <Text maxFontSizeMultiplier={1.1} className="text-[17px] font-black text-ink">{v}%</Text>
      </View>
      <View className="mt-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden"><View style={{ width: `${v}%`, backgroundColor: color }} className="h-full rounded-full" /></View>
    </View>
  );
}

function DateMetric({ label, value, color, icon }: { label: string; value: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }) {
  return (
    <View className="flex-1 bg-white rounded-2xl border border-line px-3 py-2.5 flex-row items-center gap-2.5" accessible accessibilityLabel={`${label}: ${value}`}>
      <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: color + '1F' }}><Ionicons name={icon} size={16} color={color} /></View>
      <View className="flex-1">
        <Text maxFontSizeMultiplier={1.1} className="text-xs text-muted" numberOfLines={1}>{label}</Text>
        <Text maxFontSizeMultiplier={1.15} className="text-[13px] font-bold text-ink" numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function InfoPill({ icon, color, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; text: string }) {
  return (
    <View className="flex-row items-center gap-1.5 bg-white rounded-full px-3 py-1.5 border border-line">
      <Ionicons name={icon} size={14} color={color} />
      <Text maxFontSizeMultiplier={1.15} className="text-[13px] font-medium text-ink">{text}</Text>
    </View>
  );
}

function ActionBtn({ icon, label, onPress, tone = 'neutral', active }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; tone?: 'neutral' | 'red'; active?: boolean }) {
  const red = tone === 'red';
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} className={cn('flex-1 items-center gap-0.5 py-2 rounded-2xl border active:opacity-80', active ? (red ? 'bg-red border-red' : 'bg-red-soft border-red/30') : 'bg-white border-line')}>
      <Ionicons name={icon} size={18} color={active && red ? '#fff' : red ? colors.red : colors.muted} />
      <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className={cn('text-[11px] font-bold', active && red ? 'text-white' : red ? 'text-red' : 'text-muted')}>{label}</Text>
    </Pressable>
  );
}

export default function PetProfileScreen({ route, navigation }: any) {
  const { pets, appointments, toggleFavorite, updatePet, deletePet, loaded } = usePets();
  const pet = pets.find((p) => p.id === route.params.id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', breed: '', weight: '', gender: 'Male' });

  // Real records from the API (same endpoints as the web Pet Details page)
  const petId = route.params.id as string;
  const [detail, setDetail] = useState<PetDetail>({});
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [vaccines, setVaccines] = useState<Vaccination[]>([]);
  const [notes, setNotes] = useState<PetNote[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRecords = useCallback(async () => {
    // allSettled: one failing endpoint must not blank the others (same as the web page)
    const [d, m, v, n] = await Promise.allSettled([
      petRecordsService.detail(petId),
      petRecordsService.medicalRecords(petId),
      petRecordsService.vaccinations(petId),
      petRecordsService.notes(petId),
    ]);
    if (d.status === 'fulfilled') setDetail(d.value);
    if (m.status === 'fulfilled') setRecords(m.value);
    if (v.status === 'fulfilled') setVaccines(v.value);
    if (n.status === 'fulfilled') setNotes(n.value);
    const failed = [d, m, v, n].filter((r) => r.status === 'rejected') as PromiseRejectedResult[];
    if (failed.length) {
      console.log('Pet records failed to load:', failed.map((f) => f.reason?.message));
      toast.error("Some pet records couldn't be loaded. Pull down to retry.");
    }
    setRecordsLoading(false);
  }, [petId]);

  // refetch whenever the screen is focused (e.g. back from booking / appointment detail)
  useFocusEffect(useCallback(() => { loadRecords(); }, [loadRecords]));
  const onRefresh = async () => { setRefreshing(true); await loadRecords(); setRefreshing(false); };

  if (!pet) return loaded ? <View className="flex-1 bg-cream justify-center"><Empty emoji="🐾" title="Pet not found" body="This pet may have been deleted." /></View> : <PetProfileSkeleton />;

  const visits = appointments.filter((a) => (a.petId ? a.petId === pet.id : a.pet === pet.name));
  const last = visits.find((a) => a.status === 'Completed');
  const next = visits.find((a) => ['Pending', 'Confirmed', 'In Progress'].includes(a.status));
  const rx: Prescription | undefined = detail.prescription;
  // The API's pet document knows the real last / next visit; fall back to the loaded appointments
  const lastLabel = detail.lastCheckDate ? isoToDDMM(detail.lastCheckDate) : last ? last.date : 'No Records';
  const nextLabel = detail.nextVisit ? isoToDDMM(detail.nextVisit) : next ? next.date : 'No Appointment';

  const openEdit = () => { setForm({ name: pet.name, breed: pet.breed, weight: pet.weight.replace(/[^\d.]/g, ''), gender: pet.gender }); setEditing(true); };
  const saveEdit = async () => {
    if (!form.name.trim()) return toast.error('Pet name is required');
    const ok = await updatePet(pet.id, { name: form.name.trim(), breed: form.breed.trim(), gender: form.gender, weight: form.weight ? `${form.weight} kg` : pet.weight });
    if (!ok) return;
    setEditing(false);
    toast.success('Pet details updated');
  };

  const toggleMissing = async () => {
    if (!pet.isMissing) {
      const r = await WonPetsAlert.confirm(`Report ${pet.name} missing?`, 'Your contact info will show on the QR scan page so a finder can reach you.', { confirmText: 'Report missing' });
      if (!r.isConfirmed) return;
    }
    if (!(await updatePet(pet.id, { isMissing: !pet.isMissing }))) return;
    toast.success(pet.isMissing ? `${pet.name} marked as found` : 'Reported missing — QR page now shows your contact info');
  };

  const onDelete = async () => {
    const r = await WonPetsAlert.delete(`Delete ${pet.name}?`, `${pet.name}'s profile will be removed and its QR code will stop working. Past appointments and medical records are kept for your vets.`, { confirmText: 'Yes, delete' });
    if (!r.isConfirmed) return;
    if (!(await deletePet(pet.id))) return; // e.g. the pet still has upcoming appointments
    navigation.goBack();
    toast.success(`${pet.name} was deleted`);
  };

  return (
    <>
      <ScrollView className="flex-1 bg-cream" contentContainerClassName="p-4 gap-3.5 pb-10" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
                {/* Missing banner */}
        {pet.isMissing && (
          <View className="flex-row items-center gap-2.5 bg-red-soft border border-red/30 rounded-2xl px-3.5 py-3">
            <Ionicons name="warning" size={20} color={colors.red} />
            <Text maxFontSizeMultiplier={1.15} className="flex-1 text-[13px] text-red font-semibold leading-[18px]">Reported missing. Your contact info is showing on {pet.name}'s QR page.</Text>
          </View>
        )}

        {/* Hero */}
        <Card className="gap-3 bg-primary-soft/60 border-orange-100">
          <View className="flex-row items-center gap-3.5">
            <View className="border-[3px] border-yellow rounded-full"><PetAvatar emoji={pet.emoji} image={pet.image} size={84} /></View>
            <View className="flex-1 gap-1.5">
              <Text maxFontSizeMultiplier={1.2} className="text-2xl font-black text-ink" numberOfLines={2}>{pet.name}</Text>
              <View className="flex-row items-center gap-2 flex-wrap">
                <Chip label={pet.breed} tone="orange" />
                {pet.isMissing && <Chip label="Missing" tone="red" />}
              </View>
            </View>
          </View>
          <View className="flex-row flex-wrap gap-2">
            <InfoPill icon={pet.gender === 'Male' ? 'male' : 'female'} color={pet.gender === 'Male' ? colors.blue : colors.pink} text={pet.gender} />
            <InfoPill icon="paw" color={colors.primary} text={getPetAgeLabel(pet)} />
            <InfoPill icon="barbell-outline" color={colors.blue} text={pet.weight} />
          </View>
          <View className="flex-row gap-2.5">
            <MetricBar label="Health" value={pet.health ?? 100} color={colors.green} />
            <MetricBar label="Activity" value={pet.activity ?? 100} color={colors.yellow} />
          </View>
          <View className="flex-row gap-2.5">
            <DateMetric label="Last check" value={lastLabel} color={colors.blue} icon="checkmark-done-outline" />
            <DateMetric label="Next visit" value={nextLabel} color={colors.primary} icon="calendar-outline" />
          </View>
          <View className="flex-row gap-2">
            <ActionBtn icon={pet.favorite ? 'heart' : 'heart-outline'} label="Favourite" tone="red" active={pet.favorite} onPress={() => toggleFavorite(pet.id)} />
            <ActionBtn icon="create-outline" label="Edit" onPress={openEdit} />
            <ActionBtn icon="trash-outline" label="Delete" onPress={onDelete} />
            <ActionBtn icon="warning-outline" label={pet.isMissing ? 'Found' : 'Missing'} tone="red" active={pet.isMissing} onPress={toggleMissing} />
          </View>
        </Card>

        <QRCodeCard pet={pet} />
        <StatsGrid appointments={visits} />
        <AppointmentsCard appointments={visits} onOpen={(id) => navigation.navigate('AppointmentDetail', { id })} />
        <MedicalRecordsCard records={records} loading={recordsLoading} />
        <PrescriptionCard prescription={rx} loading={recordsLoading} />
        <VaccinationsCard vaccinations={vaccines} loading={recordsLoading} />
        {notes.length > 0 && <NotesCard notes={notes} />}
        <Button title={`Book a visit for ${pet.name}`} onPress={() => navigation.navigate('BookAppointment', { petId: pet.id })} />
      </ScrollView>

      {/* Edit pet (bottom sheet) */}
      <Modal visible={editing} transparent animationType="slide" onRequestClose={() => setEditing(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 justify-end bg-black/40">
          <Pressable className="flex-1" onPress={() => setEditing(false)} />
          <View className="bg-white rounded-t-[28px] p-5 gap-3.5">
            <View className="flex-row justify-between items-center"><Text className={T.h2}>Edit {pet.name}</Text><Pressable onPress={() => setEditing(false)}><Ionicons name="close" size={24} color={colors.text} /></Pressable></View>
            <Field label="Name" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} />
            <Field label="Breed" value={form.breed} onChangeText={(v) => setForm((f) => ({ ...f, breed: v }))} />
            <Field label="Weight (kg)" keyboardType="decimal-pad" value={form.weight} onChangeText={(v) => setForm((f) => ({ ...f, weight: v }))} />
            <View><Text className="font-bold text-ink mb-1.5">Gender</Text>
              <View className="flex-row gap-2">{['Male', 'Female'].map((g) => <Chip key={g} label={g} active={form.gender === g} onPress={() => setForm((f) => ({ ...f, gender: g }))} />)}</View>
            </View>
            <Button title="Save changes" onPress={saveEdit} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}