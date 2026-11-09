import React from 'react';
import { ScrollView, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Button, Card, Chip, Gradient, T } from '../ui';
import PetAvatar from '../PetAvatar';
import InfoGrid from '../common/InfoField';
import { formatIsoDate } from '../../utils/petAge';
import type { PrescriptionView } from '../../services/appointments.service';

export type RxPatient = { name: string; emoji: string; image?: string; breed?: string; age?: string; gender?: string; owner?: string; contact?: string; visit?: string };

/**
 * The read-only prescription "paper": gradient header, patient card, diagnosis, medicines, advice, share button.
 * Used by the owner's Prescription screen and the doctor's prescription view - same document, different data source.
 */
export default function PrescriptionDocument({ rx, patient, footer }: { rx: PrescriptionView; patient: RxPatient; footer?: React.ReactNode }) {
  const share = () => Share.share({
    message: [`WONPET prescription ${rx.prescriptionNo ?? ''}`, `Pet: ${patient.name}`, `Doctor: ${rx.doctor}`, `Date: ${formatIsoDate(rx.date)}`, `Diagnosis: ${rx.diagnosis}`, '',
      ...rx.medicines.map((m, i) => `${i + 1}. ${m.name} - ${m.dosage}, ${m.frequency}, ${m.duration}${m.instructions ? ` (${m.instructions})` : ''}`),
      ...(rx.advice ? ['', `Advice: ${rx.advice}`] : []), ...(rx.followUpDate ? [`Follow-up: ${formatIsoDate(rx.followUpDate)}`] : [])].join('\n'),
  });

  return (
    <ScrollView className="flex-1 bg-cream" contentContainerClassName="p-4 gap-3.5 pb-10">
      <Gradient className="rounded-3xl p-5 overflow-hidden" colorsArr={['#FF6B00', '#F59E0B']}>
        <View className="flex-row justify-between items-start">
          <View className="flex-row items-center gap-3">
            <View className="w-11 h-11 rounded-xl bg-white/25 items-center justify-center"><Text className="text-white font-black text-lg">Rx</Text></View>
            <View><Text className="text-white/80 text-[10px] font-bold uppercase">Veterinary Care</Text><Text className="text-white text-2xl font-black">Prescription</Text></View>
          </View>
          <View className="items-end"><Chip label="Issued" tone="white" /><Text className="text-white/80 text-xs mt-1.5">{formatIsoDate(rx.date)}</Text><Text className="text-white font-bold text-xs">#{rx.prescriptionNo ?? rx.id.slice(-6).toUpperCase()}</Text></View>
        </View>
      </Gradient>

      <Card className="gap-3">
        <View className="flex-row items-center justify-between"><View><Text className="text-[10px] font-bold text-primary uppercase">Patient</Text><Text className={T.h2}>Patient information</Text></View><PetAvatar emoji={patient.emoji} image={patient.image} size={46} /></View>
        <InfoGrid items={[['Pet name', patient.name], ['Breed', patient.breed], ['Age', patient.age], ['Gender', patient.gender]]} />
        <InfoGrid className="pt-3 border-t border-line" items={[['Owner', patient.owner], ['Contact', patient.contact], ['Doctor', rx.doctor], ['Visit', patient.visit]]} />
      </Card>

      <Card className="gap-3">
        <Text className={T.h2}>Diagnosis & symptoms</Text>
        <View className="bg-primary-soft rounded-2xl p-3.5"><Text className="text-[10px] font-bold text-primary uppercase mb-1">Diagnosis</Text><Text className="text-sm text-ink leading-5">{rx.diagnosis || 'No diagnosis provided'}</Text></View>
        <View className="bg-cream rounded-2xl p-3.5"><Text className="text-[10px] font-bold text-muted uppercase mb-1">Symptoms</Text><Text className="text-sm text-ink leading-5">{rx.symptoms || 'No symptoms recorded.'}</Text></View>
      </Card>

      <Card className="gap-3">
        <View className="flex-row items-center justify-between"><Text className={T.h2}>Prescribed medicines</Text><Chip label={`${rx.medicines.length} medicine${rx.medicines.length > 1 ? 's' : ''}`} tone="purple" /></View>
        {rx.medicines.map((m, i) => (
          <View key={i} className="rounded-2xl bg-purple-soft/60 border border-purple/20 p-3.5 gap-2">
            <View className="flex-row items-center gap-2.5"><View className="w-8 h-8 rounded-xl bg-white items-center justify-center"><Ionicons name="medical" size={14} color={colors.purple} /></View><View className="flex-1"><Text className={T.h3}>{m.name}</Text><Text className={T.small}>{m.frequency}</Text></View></View>
            <View className="flex-row gap-2">
              {[['Dosage', m.dosage], ['Frequency', m.frequency], ['Duration', m.duration]].map(([k, v]) => <View key={k} className="flex-1 bg-white rounded-xl p-2"><Text className="text-[9px] text-muted uppercase">{k}</Text><Text className="text-xs font-bold text-ink mt-0.5">{v}</Text></View>)}
            </View>
            {!!m.instructions && <View className="bg-white rounded-xl p-2.5"><Text className="text-[9px] text-muted uppercase">Instructions</Text><Text className="text-xs text-ink mt-0.5">{m.instructions}</Text></View>}
          </View>
        ))}
      </Card>

      <Card className="gap-2">
        <Text className={T.h2}>Doctor's advice</Text>
        <Text className="text-sm text-ink leading-5">{rx.advice || 'No additional advice provided.'}</Text>
        <View className="flex-row items-center justify-between pt-3 mt-1 border-t border-line"><Text className={T.body}>Follow-up date</Text><Text className="font-bold text-ink">{rx.followUpDate ? formatIsoDate(rx.followUpDate) : 'Not required'}</Text></View>
      </Card>

      <Button title="Share prescription" icon={<Ionicons name="share-social-outline" size={18} color="#fff" />} onPress={share} />
      {footer}
    </ScrollView>
  );
}
