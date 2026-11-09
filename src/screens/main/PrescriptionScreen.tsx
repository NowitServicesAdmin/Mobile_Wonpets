import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Empty } from '../../components/ui';
import PrescriptionDocument from '../../components/prescription/PrescriptionDocument';
import { PrescriptionView, prescriptionService } from '../../services/appointments.service';
import { useAuth } from '../../context/AuthContext';
import { usePets } from '../../context/PetsContext';
import { getPetAgeLabel } from '../../utils/petAge';
import { PrescriptionSkeleton } from '../../components/Skeletons';

/** Read-only prescription issued in an appointment (mobile version of the web PrescriptionModal). */
export default function PrescriptionScreen({ route }: any) {
  const { appointments, pets } = usePets();
  const { user } = useAuth();
  const appt = appointments.find((a) => a.id === route.params.appointmentId);
  const [rx, setRx] = useState<PrescriptionView | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    prescriptionService.byAppointment(route.params.appointmentId).then(setRx, () => setRx(null)).finally(() => setLoading(false));
  }, [route.params.appointmentId]);
  if (loading) return <PrescriptionSkeleton />;
  if (!rx || !appt) return <View className="flex-1 bg-cream justify-center"><Empty emoji="📄" title="No prescription" body="Your vet hasn't issued a prescription for this visit." /></View>;
  const pet = pets.find((p) => p.id === appt.petId) ?? pets.find((p) => p.name === appt.pet);

  return (
    <PrescriptionDocument
      rx={rx}
      patient={{
        name: appt.pet, emoji: pet?.emoji ?? appt.emoji, image: pet?.image, breed: pet?.breed, age: pet ? getPetAgeLabel(pet) : appt.age, gender: pet?.gender,
        owner: user?.name, contact: user?.phone, visit: `${appt.date} · ${appt.mode}`,
      }}
    />
  );
}
