import React from 'react';
import { ScrollView } from 'react-native';
import { Card } from '../../components/ui';
import LanguageSection from '../../components/settings/LanguageSection';

/** Same language picker the owner sees in Settings. */
export default function DoctorLanguageScreen() {
  return <ScrollView className="flex-1 bg-cream" contentContainerClassName="p-4"><Card><LanguageSection /></Card></ScrollView>;
}
