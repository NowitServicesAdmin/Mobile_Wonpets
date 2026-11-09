import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Button, Card, Chip, Field, T } from '../../components/ui';
import { FormSkeleton } from '../../components/Skeletons';
import { toast } from '../../components/WonPetsAlert';
import { doctorService } from '../../services/doctor.service';
import { errorMessage } from '../../services/api';

const VISIT_TYPES = ['General', 'Vaccination', 'Surgery', 'Emergency', 'Follow Up']; // the backend's visit type list

/** Diagnosis / symptoms / treatment for a visit. Saving here is what feeds the pet's medical history. */
export default function MedicalRecordFormScreen({ route, navigation }: any) {
  const appointmentId: string = route.params.appointmentId;
  const [loading, setLoading] = useState(true);
  const [recId, setRecId] = useState<string | undefined>();
  const [f, setF] = useState({ diagnosis: '', symptoms: '', treatment: '', visitType: 'General', notes: '' });
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<typeof f>) => setF((x) => ({ ...x, ...patch }));

  useEffect(() => {
    doctorService.recordFor(appointmentId).then((r) => { if (r) { setRecId(r.id); setF({ diagnosis: r.diagnosis, symptoms: r.symptoms, treatment: r.treatment, visitType: r.visitType, notes: r.notes }); } })
      .catch((e) => toast.error(errorMessage(e))).finally(() => setLoading(false));
  }, [appointmentId]);

  const save = async () => {
    if (!f.diagnosis.trim() && !f.treatment.trim()) return toast.error('Add a diagnosis or a treatment.');
    setSaving(true);
    try { await doctorService.saveRecord(recId, { appointmentId, ...f }); toast.success('Medical record saved'); navigation.goBack(); }
    catch (e) { toast.error(errorMessage(e)); } finally { setSaving(false); }
  };

  if (loading) return <FormSkeleton fields={5} />;
  const multi = { multiline: true, style: { minHeight: 80, textAlignVertical: 'top' as const } };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-cream">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="p-4 gap-3.5 pb-10">
        <Card className="gap-3.5">
          <Text className={T.h2}>Visit type</Text>
          <View className="flex-row flex-wrap gap-2">{VISIT_TYPES.map((v) => <Chip key={v} label={v} active={f.visitType === v} onPress={() => set({ visitType: v })} className="px-3.5 py-2" />)}</View>
        </Card>
        <Card className="gap-3.5">
          <Field label="Diagnosis" value={f.diagnosis} onChangeText={(t) => set({ diagnosis: t })} placeholder="What you found" {...multi} />
          <Field label="Symptoms" value={f.symptoms} onChangeText={(t) => set({ symptoms: t })} placeholder="What the owner reported" {...multi} />
          <Field label="Treatment" value={f.treatment} onChangeText={(t) => set({ treatment: t })} placeholder="What was done" {...multi} />
          <Field label="Notes" value={f.notes} onChangeText={(t) => set({ notes: t })} placeholder="Anything else worth remembering" {...multi} />
        </Card>
        <Button title={saving ? 'Saving…' : 'Save record'} disabled={saving} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
