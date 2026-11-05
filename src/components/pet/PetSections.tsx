import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Card, Chip, Tone, T, cn } from '../ui';
import type { Appointment } from '../../data/mock';
import { MedicalRecord, PetNote, Prescription, Vaccination, vaccineStatus } from '../../data/petRecords';
import { formatIsoDate } from '../../utils/petAge';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const iconTone = {
  orange: { box: 'bg-primary-soft', badge: 'bg-primary-soft', badgeText: 'text-primary', color: colors.primary },
  blue: { box: 'bg-blue-soft', badge: 'bg-blue-soft', badgeText: 'text-blue', color: colors.blue },
  purple: { box: 'bg-purple-soft', badge: 'bg-purple-soft', badgeText: 'text-purple', color: colors.purple },
  green: { box: 'bg-green-soft', badge: 'bg-green-soft', badgeText: 'text-green', color: colors.green },
  pink: { box: 'bg-pink-soft', badge: 'bg-pink-soft', badgeText: 'text-pink', color: colors.pink },
  red: { box: 'bg-red-soft', badge: 'bg-red-soft', badgeText: 'text-red', color: colors.red },
};
type ToneKey = keyof typeof iconTone;

/** Titled card used by every record section on the pet profile. */
export function SectionCard({ icon, tone = 'orange', title, subtitle, count, children }: {
  icon: IconName; tone?: ToneKey; title: string; subtitle?: string; count?: number; children: React.ReactNode;
}) {
  const t = iconTone[tone];
  return (
    <Card className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className={cn('w-10 h-10 rounded-full items-center justify-center', t.box)}><Ionicons name={icon} size={19} color={t.color} /></View>
        <View className="flex-1">
          <Text maxFontSizeMultiplier={1.15} className="text-[17px] font-extrabold text-ink" numberOfLines={1}>{title}</Text>
          {!!subtitle && <Text maxFontSizeMultiplier={1.15} className={T.small} numberOfLines={1}>{subtitle}</Text>}
        </View>
        {count !== undefined && <View className={cn('min-w-[30px] h-[30px] px-2 rounded-full items-center justify-center', t.badge)}><Text maxFontSizeMultiplier={1.1} className={cn('font-bold text-[13px]', t.badgeText)}>{count}</Text></View>}
      </View>
      {children}
    </Card>
  );
}

function EmptyRow({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <View className="items-center py-4 gap-1 bg-cream rounded-2xl">
      <Ionicons name={icon} size={30} color="#D6CCC2" />
      <Text className={T.h3}>{title}</Text>
      <Text className={T.small + ' text-center px-4'}>{body}</Text>
    </View>
  );
}

function LoadingRow() {
  return <View className="items-center py-6"><ActivityIndicator color={colors.primary} /></View>;
}

/** Small uppercase label + value cell. */
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 bg-white rounded-xl px-2.5 py-2 border border-purple/10">
      <Text maxFontSizeMultiplier={1.1} className="text-[10px] font-bold text-muted uppercase" numberOfLines={1}>{label}</Text>
      <Text maxFontSizeMultiplier={1.15} className="text-[14px] font-bold text-ink mt-0.5" numberOfLines={1}>{value}</Text>
    </View>
  );
}

const statusTone: Record<string, Tone> = { Pending: 'yellow', Confirmed: 'blue', Upcoming: 'blue', 'In Progress': 'purple', Completed: 'green', Cancelled: 'red' };

/** One compact row of four counters. */
export function StatsGrid({ appointments }: { appointments: Appointment[] }) {
  const count = (f: (a: Appointment) => boolean) => appointments.filter(f).length;
  const cards: { label: string; value: number; icon: IconName; tone: ToneKey }[] = [
    { label: 'Total', value: appointments.length, icon: 'calendar', tone: 'blue' },
    { label: 'Upcoming', value: count((a) => ['Pending', 'Confirmed', 'In Progress'].includes(a.status)), icon: 'time', tone: 'orange' },
    { label: 'Completed', value: count((a) => a.status === 'Completed'), icon: 'checkmark-circle', tone: 'green' },
    { label: 'Cancelled', value: count((a) => a.status === 'Cancelled'), icon: 'ban', tone: 'red' },
  ];
  return (
    <View className="flex-row gap-2">
      {cards.map((c) => {
        const t = iconTone[c.tone];
        return (
          <View key={c.label} className="flex-1 bg-white rounded-2xl border border-line py-3 px-1 items-center gap-1" accessible accessibilityLabel={`${c.label} appointments: ${c.value}`}>
            <View className={cn('w-8 h-8 rounded-full items-center justify-center', t.box)}><Ionicons name={c.icon} size={16} color={t.color} /></View>
            <Text maxFontSizeMultiplier={1.1} className="text-[20px] font-black text-ink leading-6">{c.value}</Text>
            <Text maxFontSizeMultiplier={1.05} className="text-[10.5px] font-semibold text-muted" numberOfLines={1} adjustsFontSizeToFit>{c.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function AppointmentsCard({ appointments, onOpen }: { appointments: Appointment[]; onOpen: (id: string) => void }) {
  return (
    <SectionCard icon="calendar" title="Recent Appointments" subtitle="Consultation history">
      {appointments.length === 0 ? <EmptyRow icon="calendar-outline" title="No Appointments" body="This pet doesn't have any appointments yet." /> : appointments.slice(0, 4).map((a) => {
        const online = /online|video/i.test(a.mode || '');
        return (
          <Pressable key={a.id} onPress={() => onOpen(a.id)} accessibilityRole="button" className="flex-row items-center gap-3 rounded-2xl border border-line px-3 py-2.5 active:bg-cream">
            <View className={cn('w-9 h-9 rounded-full items-center justify-center', online ? 'bg-blue-soft' : 'bg-primary-soft')}>
              <Ionicons name={online ? 'videocam-outline' : 'location-outline'} size={17} color={online ? colors.blue : colors.primary} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text maxFontSizeMultiplier={1.15} className={T.h3} numberOfLines={1}>{a.doctor || a.mode}</Text>
              <Text maxFontSizeMultiplier={1.15} className={T.small} numberOfLines={1}>{a.date} · {a.time} · {a.mode}</Text>
            </View>
            <Chip label={a.status} tone={statusTone[a.status] || 'orange'} />
            <Ionicons name="chevron-forward" size={15} color={colors.muted} />
          </Pressable>
        );
      })}
    </SectionCard>
  );
}

const fileIcon: Record<string, [IconName, string]> = { image: ['image', colors.blue], pdf: ['document-text', colors.red], file: ['document', colors.muted] };

export function MedicalRecordsCard({ records, loading }: { records: MedicalRecord[]; loading?: boolean }) {
  // undefined = "not touched yet" -> the newest record is open by default; null = user closed it
  const [open, setOpen] = useState<string | null | undefined>(undefined);
  const openId = open === undefined ? records[0]?.id : open;
  return (
    <SectionCard icon="medkit" title="Medical Records" subtitle="Diagnosis & treatment history" count={records.length}>
      {loading && records.length === 0 ? <LoadingRow /> : records.length === 0 ? <EmptyRow icon="medkit-outline" title="No Medical Records" body="No diagnosis or treatment records available." /> : records.map((r) => {
        const isOpen = openId === r.id;
        return (
          <View key={r.id} className={cn('rounded-2xl border overflow-hidden', isOpen ? 'border-blue/30' : 'border-line')}>
            <Pressable onPress={() => setOpen(isOpen ? null : r.id)} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} className="flex-row items-center gap-3 px-3 py-2.5 active:bg-cream">
              <View className="w-9 h-9 rounded-full bg-blue-soft items-center justify-center"><Ionicons name="document-text-outline" size={17} color={colors.blue} /></View>
              <View className="flex-1 gap-0.5">
                <Text maxFontSizeMultiplier={1.15} className={T.h3}>{formatIsoDate(r.visitDate)}</Text>
                <Text maxFontSizeMultiplier={1.15} className={cn(T.small, !r.diagnosis && 'italic')} numberOfLines={1}>{r.diagnosis || 'No diagnosis recorded'}</Text>
              </View>
              {!!r.files?.length && <View className="flex-row items-center gap-0.5"><Ionicons name="attach" size={15} color={colors.blue} /><Text className="text-xs font-bold text-blue">{r.files.length}</Text></View>}
              <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
            </Pressable>
            {isOpen && (
              <View className="px-3 pb-3 gap-2">
                {!!r.diagnosis && <View className="bg-blue-soft/50 rounded-xl p-3"><Text className="text-[11px] font-bold text-blue uppercase mb-1">Diagnosis</Text><Text className="text-sm text-ink leading-5">{r.diagnosis}</Text></View>}
                {!!r.treatment && <View className="bg-green-soft/60 rounded-xl p-3"><Text className="text-[11px] font-bold text-green uppercase mb-1">Treatment</Text><Text className="text-sm text-ink leading-5">{r.treatment}</Text></View>}
                {!!r.notes && <View className="bg-cream rounded-xl p-3"><Text className="text-[11px] font-bold text-muted uppercase mb-1">Notes</Text><Text className="text-sm text-ink leading-5">{r.notes}</Text></View>}
                {!!r.files?.length && (
                  <View className="gap-1.5">
                    <Text className="text-[11px] font-bold text-primary uppercase">Attached files</Text>
                    {r.files.map((f) => (
                      <Pressable key={f.id} disabled={!f.url} onPress={() => f.url && Linking.openURL(f.url)} className="flex-row items-center gap-2 bg-primary-soft rounded-xl px-2.5 py-2 active:opacity-80">
                        <Ionicons name={fileIcon[f.kind][0]} size={16} color={fileIcon[f.kind][1]} /><Text className="flex-1 text-xs text-ink" numberOfLines={1}>{f.name}</Text>
                        {!!f.url && <Ionicons name="open-outline" size={14} color={colors.muted} />}
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
    </SectionCard>
  );
}

export function PrescriptionCard({ prescription, loading }: { prescription?: Prescription; loading?: boolean }) {
  return (
    <SectionCard icon="document-text" tone="purple" title="Latest Prescription" subtitle={prescription ? `${prescription.doctor} · ${formatIsoDate(prescription.date)}` : 'Medicines prescribed by your vet'}>
      {loading && !prescription ? <LoadingRow /> : !prescription ? <EmptyRow icon="document-text-outline" title="No Prescription" body="Prescriptions from your vet will appear here." /> : (
        <>
          {!!prescription.diagnosis && (
            <View className="flex-row items-center gap-2 bg-purple-soft/50 rounded-xl px-3 py-2">
              <Ionicons name="pulse" size={15} color={colors.purple} />
              <Text className="text-[11px] font-bold text-purple uppercase">Diagnosis</Text>
              <Text className="text-sm font-semibold text-ink flex-1" numberOfLines={2}>{prescription.diagnosis}</Text>
            </View>
          )}
          {!!prescription.symptoms && <Text className={T.small}>Symptoms: {prescription.symptoms}</Text>}
          {prescription.medicines.map((m, i) => {
            const cells = [['Dosage', m.dosage], ['Frequency', m.frequency], ['Duration', m.duration]].filter(([, v]) => !!v) as [string, string][];
            const hasDates = !!m.startDate || !!m.endDate;
            return (
              <View key={i} className="rounded-2xl bg-purple-soft/60 border border-purple/20 p-3 gap-2.5">
                <View className="flex-row items-center gap-2">
                  <View className="w-7 h-7 rounded-full bg-white items-center justify-center"><Ionicons name="medical" size={14} color={colors.purple} /></View>
                  <Text maxFontSizeMultiplier={1.15} className="flex-1 text-[16px] font-extrabold text-ink" numberOfLines={2}>{m.name}</Text>
                </View>
                {cells.length > 0 && <View className="flex-row gap-2">{cells.map(([l, v]) => <Mini key={l} label={l} value={v} />)}</View>}
                {!!m.reminderTimes?.length && (
                  <View className="flex-row items-center gap-1.5 flex-wrap">
                    <Ionicons name="alarm-outline" size={15} color={colors.purple} />
                    {m.reminderTimes.map((t) => <View key={t} className="bg-white rounded-full px-2.5 py-0.5 border border-purple/20"><Text maxFontSizeMultiplier={1.1} className="text-xs font-bold text-purple">{t}</Text></View>)}
                  </View>
                )}
                {hasDates && (
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="calendar-outline" size={14} color={colors.muted} />
                    <Text className={T.small}>{m.startDate ? formatIsoDate(m.startDate) : '—'}  →  {m.endDate ? formatIsoDate(m.endDate) : 'Ongoing'}</Text>
                  </View>
                )}
                {!!m.instructions && (
                  <View className="flex-row items-start gap-1.5">
                    <Ionicons name="information-circle-outline" size={15} color={colors.muted} />
                    <Text className="flex-1 text-xs text-muted leading-[18px]">{m.instructions}</Text>
                  </View>
                )}
              </View>
            );
          })}
          {!!prescription.followUpDate && (
            <View className="flex-row items-center gap-2 bg-primary-soft rounded-xl px-3 py-2.5">
              <Ionicons name="repeat" size={16} color={colors.primary} />
              <Text className="text-sm font-bold text-primary-dark">Follow-up on {formatIsoDate(prescription.followUpDate)}</Text>
            </View>
          )}
          {!!prescription.advice && <View className="bg-cream rounded-xl p-3"><Text className="text-[11px] font-bold text-muted uppercase mb-1">Advice</Text><Text className="text-sm text-ink leading-5">{prescription.advice}</Text></View>}
        </>
      )}
    </SectionCard>
  );
}

const vaccineTone: Record<string, Tone> = { 'Up to date': 'green', 'Due soon': 'yellow', Overdue: 'red' };

export function VaccinationsCard({ vaccinations, loading }: { vaccinations: Vaccination[]; loading?: boolean }) {
  return (
    <SectionCard icon="shield-checkmark" tone="green" title="Vaccinations" subtitle="Immunisation schedule" count={vaccinations.length}>
      {loading && vaccinations.length === 0 ? <LoadingRow /> : vaccinations.length === 0 ? <EmptyRow icon="shield-outline" title="No Vaccinations" body="No vaccination records added yet." /> : vaccinations.map((v) => {
        const status = vaccineStatus(v.nextDue);
        return (
          <View key={v.id} className="rounded-2xl border border-line p-3 gap-2">
            <View className="flex-row justify-between items-center gap-2"><Text maxFontSizeMultiplier={1.15} className={cn(T.h3, 'flex-1')} numberOfLines={1}>{v.name}</Text>{!!v.nextDue && <Chip label={status} tone={vaccineTone[status]} />}</View>
            <View className="flex-row gap-2">
              <View className="flex-1 bg-cream rounded-xl px-2.5 py-2"><Text className="text-[10px] font-bold text-muted uppercase">Given</Text><Text className="text-[13px] font-bold text-ink mt-0.5">{formatIsoDate(v.givenOn)}</Text></View>
              {!!v.nextDue && <View className="flex-1 bg-cream rounded-xl px-2.5 py-2"><Text className="text-[10px] font-bold text-muted uppercase">Next due</Text><Text className="text-[13px] font-bold text-ink mt-0.5">{formatIsoDate(v.nextDue)}</Text></View>}
            </View>
            {!!v.vet && <Text className={T.small}>By {v.vet}</Text>}
            {!!v.notes && <Text className={T.small}>{v.notes}</Text>}
          </View>
        );
      })}
    </SectionCard>
  );
}

export function NotesCard({ notes }: { notes: PetNote[] }) {
  return (
    <SectionCard icon="create" tone="pink" title="Caretaker Notes" subtitle="Added by your co-owner or sitter" count={notes.length}>
      {notes.map((n) => (
        <View key={n.id} className="rounded-2xl bg-pink-soft/50 p-3 gap-1">
          <Text className="text-sm text-ink leading-5">{n.text}</Text>
          <Text className={T.small}>{n.author} · {formatIsoDate(n.date)}</Text>
        </View>
      ))}
    </SectionCard>
  );
}