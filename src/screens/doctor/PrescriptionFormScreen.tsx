import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Card, Field, T } from '../../components/ui';
import DateFields from '../../components/DateFields';
import { FormSkeleton } from '../../components/Skeletons';
import { toast } from '../../components/WonPetsAlert';
import { doctorService } from '../../services/doctor.service';
import type { RxMedicine } from '../../services/doctor.mappers';
import { errorMessage } from '../../services/api';
import { todayInputValue } from '../../utils/petAge';

const blank = (): RxMedicine => ({ name: '', dosage: '', frequency: '', duration: '', notes: '' });

/** Write or edit the prescription of an appointment (the same fields as the web prescription form). */
export default function PrescriptionFormScreen({ route, navigation }: any) {
  const appointmentId: string = route.params.appointmentId;
  const [loading, setLoading] = useState(true);
  const [rxId, setRxId] = useState<string | undefined>();
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [instructions, setInstructions] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [meds, setMeds] = useState<RxMedicine[]>([blank()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    doctorService.prescriptionFor(appointmentId).then((p) => {
      if (p) { setRxId(p.id); setDiagnosis(p.diagnosis); setSymptoms(p.symptoms); setInstructions(p.instructions); setFollowUp(p.followUpDate); setMeds(p.medicines.length ? p.medicines : [blank()]); }
    }).catch((e) => toast.error(errorMessage(e))).finally(() => setLoading(false));
  }, [appointmentId]);
  useEffect(() => { navigation.setOptions({ title: rxId ? 'Edit prescription' : 'New prescription' }); }, [rxId]);

  const setMed = (i: number, patch: Partial<RxMedicine>) => setMeds((l) => l.map((m, x) => (x === i ? { ...m, ...patch } : m)));
  const save = async () => {
    const medicines = meds.map((m) => ({ ...m, name: m.name.trim() })).filter((m) => m.name);
    if (!diagnosis.trim()) return toast.error('Please enter a diagnosis.');
    if (!medicines.length) return toast.error('Add at least one medicine.');
    setSaving(true);
    try {
      const body = { diagnosis: diagnosis.trim(), symptoms: symptoms.trim(), instructions: instructions.trim(), followUpDate: followUp, medicines };
      if (rxId) await doctorService.updatePrescription(rxId, body);
      else await doctorService.createPrescription({ appointmentId, ...body });
      toast.success('Prescription saved');
      navigation.goBack();
    } catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
  };

  if (loading) return <FormSkeleton fields={5} />;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-cream">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="p-4 gap-3.5 pb-10">
        <Card className="gap-3.5">
          <Text className={T.h2}>Diagnosis</Text>
          <Field label="Diagnosis *" value={diagnosis} onChangeText={setDiagnosis} placeholder="e.g. Skin allergy" />
          <Field label="Symptoms" value={symptoms} onChangeText={setSymptoms} multiline placeholder="What the owner reported" style={{ minHeight: 80, textAlignVertical: 'top' }} />
        </Card>

        <Card className="gap-3.5">
          <View className="flex-row items-center justify-between"><Text className={T.h2}>Medicines</Text><Text className={T.small}>{meds.length} added</Text></View>
          {meds.map((m, i) => (
            <View key={i} className="rounded-2xl bg-purple-soft/50 border border-purple/20 p-3 gap-2.5">
              <View className="flex-row items-center justify-between"><Text className="text-[12px] font-extrabold text-purple uppercase">Medicine {i + 1}</Text>{meds.length > 1 && <Pressable hitSlop={8} onPress={() => setMeds((l) => l.filter((_, x) => x !== i))} accessibilityLabel="Remove medicine"><Ionicons name="trash-outline" size={18} color={colors.red} /></Pressable>}</View>
              <Field value={m.name} onChangeText={(t) => setMed(i, { name: t })} placeholder="Medicine name *" />
              <View className="flex-row gap-2">
                <Field className="flex-1" value={m.dosage} onChangeText={(t) => setMed(i, { dosage: t })} placeholder="Dosage" />
                <Field className="flex-1" value={m.duration} onChangeText={(t) => setMed(i, { duration: t })} placeholder="Duration" />
              </View>
              <Field value={m.frequency} onChangeText={(t) => setMed(i, { frequency: t })} placeholder="Frequency (e.g. twice a day)" />
              <Field value={m.notes ?? ''} onChangeText={(t) => setMed(i, { notes: t })} placeholder="Instructions (optional)" />
            </View>
          ))}
          <Button title="Add another medicine" variant="outline" icon={<Ionicons name="add" size={18} color={colors.primary} />} onPress={() => setMeds((l) => [...l, blank()])} />
        </Card>

        <Card className="gap-3.5">
          <Text className={T.h2}>Advice & follow-up</Text>
          <Field label="Doctor's advice" value={instructions} onChangeText={setInstructions} multiline placeholder="Diet, rest, care at home…" style={{ minHeight: 80, textAlignVertical: 'top' }} />
          <DateFields label="Follow-up date (optional)" value={followUp} onChange={setFollowUp} min={todayInputValue()} hint="The owner and your follow-up list are reminded." />
        </Card>

        <Button title={saving ? 'Saving…' : rxId ? 'Save changes' : 'Issue prescription'} disabled={saving} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
