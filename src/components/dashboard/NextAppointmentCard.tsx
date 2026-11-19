import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gradient } from '../ui';
import type { Appointment } from '../../data/mock';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dateLabel(a: Appointment) {
  if (a.isoDate && /^\d{4}-\d{2}-\d{2}/.test(a.isoDate)) {
    const [y, m, d] = a.isoDate.slice(0, 10).split('-');
    return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
  }
  return a.date;
}

type Props = { appointment: Appointment | null; onOpen: () => void; onBook: () => void };

/** Orange "Next Appointment" card from the web dashboard. */
export default function NextAppointmentCard({ appointment: a, onOpen, onBook }: Props) {
  return (
    <Gradient colorsArr={['#FB923C', '#F97316', '#F59E0B']} className="rounded-3xl p-3.5 overflow-hidden">
      <View pointerEvents="none" className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10" />
      <View className="flex-row items-center gap-2 mb-3">
        <View className="w-8 h-8 rounded-full bg-white/25 items-center justify-center"><Ionicons name="calendar-outline" size={16} color="#fff" /></View>
        <Text maxFontSizeMultiplier={1.1} className="text-[15px] font-extrabold text-white">Next Appointment</Text>
      </View>

      {a ? (
        <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel="Open appointments" className="flex-row items-center gap-2.5 active:opacity-90">
          <View className="w-11 h-11 rounded-full bg-white/90 border-2 border-white overflow-hidden items-center justify-center">
            {a.doctorImage ? <Image source={{ uri: a.doctorImage }} style={{ width: 44, height: 44 }} /> : <Ionicons name="medkit-outline" size={20} color="#F97316" />}
          </View>
          <View className="flex-1">
            <Text maxFontSizeMultiplier={1.1} className="text-[14px] font-extrabold text-white" numberOfLines={1}>{a.pet || 'Pet'}</Text>
            <Text maxFontSizeMultiplier={1.1} className="text-[12px] text-white/90" numberOfLines={1}>
              {a.doctor ? `Dr. ${a.doctor.replace(/^dr\.?\s*/i, '')}` : 'Vet'} · {a.visitType || a.reason || 'Appointment'}
            </Text>
            <View className="flex-row items-center gap-1 mt-0.5">
              <Ionicons name="calendar-outline" size={11} color="#fff" />
              <Text maxFontSizeMultiplier={1.1} className="text-[11px] text-white/90" numberOfLines={1}>{dateLabel(a)}{a.time ? `, ${a.time}` : ''}</Text>
            </View>
          </View>
          <View className="items-end gap-1.5">
            <View className="bg-white rounded-full px-2.5 py-0.5"><Text maxFontSizeMultiplier={1.1} className="text-[10.5px] font-bold text-orange-600">{a.status || 'Pending'}</Text></View>
            <View className="w-7 h-7 rounded-full bg-white items-center justify-center"><Ionicons name="chevron-forward" size={15} color="#F97316" /></View>
          </View>
        </Pressable>
      ) : (
        <View className="flex-row items-center justify-between gap-3">
          <Text maxFontSizeMultiplier={1.1} className="text-[13px] text-white/90 flex-1">No upcoming appointments.</Text>
          <Pressable onPress={onBook} accessibilityRole="button" className="bg-white rounded-full px-3.5 py-1.5 active:opacity-80">
            <Text maxFontSizeMultiplier={1.1} className="text-[12px] font-bold text-orange-600">Book now</Text>
          </Pressable>
        </View>
      )}
    </Gradient>
  );
}