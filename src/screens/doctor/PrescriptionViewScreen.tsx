import React from 'react';
import { View } from 'react-native';
import { Button, Empty } from '../../components/ui';
import PrescriptionDocument from '../../components/prescription/PrescriptionDocument';
import { PrescriptionSkeleton } from '../../components/Skeletons';
import { useRemote } from '../../hooks/useRemote';
import { doctorService } from '../../services/doctor.service';
import { useDoctor } from '../../context/DoctorContext';
import { useAuth } from '../../context/AuthContext';

/** A prescription as the owner sees it (same document component), with a shortcut to edit it. */
export default function PrescriptionViewScreen({ route, navigation }: any) {
  const appointmentId: string = route.params.appointmentId;
  const { tick } = useDoctor();
  const { user } = useAuth();
  const rx = useRemote(() => doctorService.prescriptionFor(appointmentId), [appointmentId], tick);
  const appt = useRemote(() => doctorService.appointment(appointmentId), [appointmentId]);
  if (rx.loading) return <PrescriptionSkeleton />;
  const p = rx.data, a = appt.data;
  if (!p) return <View className="flex-1 bg-cream justify-center"><Empty emoji="📄" title="No prescription" body="No prescription has been issued for this visit." /></View>;
  return (
    <PrescriptionDocument
      rx={{
        id: p.id, doctor: user?.name ? (/^dr\.?\s/i.test(user.name) ? user.name : `Dr. ${user.name}`) : 'Doctor', date: p.date, diagnosis: p.diagnosis, prescriptionNo: p.prescriptionNo,
        symptoms: p.symptoms, followUpDate: p.followUpDate || undefined, advice: p.instructions,
        medicines: p.medicines.map((m) => ({ name: m.name, dosage: m.dosage, frequency: m.frequency, duration: m.duration, instructions: m.notes })),
      }}
      patient={{ name: a?.pet ?? p.pet ?? 'Pet', emoji: a?.emoji ?? '🐾', image: a?.petImage ?? p.petImage, breed: a?.breed ?? p.breed, age: a?.age, gender: a?.petGender, owner: a?.owner ?? p.owner, contact: a?.ownerPhone ?? p.ownerPhone, visit: a ? `${a.date} · ${a.mode}` : undefined }}
      footer={<Button title="Edit prescription" variant="outline" onPress={() => navigation.navigate('PrescriptionForm', { appointmentId })} />}
    />
  );
}
