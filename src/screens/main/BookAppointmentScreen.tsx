import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { colors } from '../../theme';
import { Button, Card, Chip, Field, T, cn } from '../../components/ui';
import { Avatar } from '../../components/Avatar';
import PetAvatar from '../../components/PetAvatar';
import SlotPicker, { DAYS, ddmm } from '../../components/appointments/SlotPicker';
import AddressSheet from '../../components/store/AddressSheet';
import { WonPetsAlert, toast } from '../../components/WonPetsAlert';
import { AppointmentMode, Doctor } from '../../data/mock';
import { usePets } from '../../context/PetsContext';
import { useCart } from '../../context/CartContext';
import { inr } from '../../utils/orders';
import { getCurrentCoords } from '../../utils/location';
import { payWithRazorpay, PaymentCancelled } from '../../utils/razorpay';
import { appointmentsService } from '../../services/appointments.service';
import { errorMessage } from '../../services/api';
import { to12h } from '../../services/mappers';
import { useAuth } from '../../context/AuthContext';

const types: { mode: AppointmentMode; desc: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { mode: 'Clinic Visit', desc: 'Visit clinic', icon: 'location' },
  { mode: 'Online', desc: 'Video consultation', icon: 'videocam' },
  { mode: 'Home Care', desc: 'Home visit', icon: 'home' },
  { mode: 'Emergency', desc: 'Urgent care', icon: 'alert-circle' },
];
type Attach = { uri: string; name: string; type: string; size?: number };
const MAX_FILES = 6;
const MAX_BYTES = 5 * 1024 * 1024;
const DOC_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/*'];
const isImg = (a: Attach) => a.type.startsWith('image/');
const fmtSize = (b?: number) => (!b ? '' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
const docIcon = (a: Attach): { name: React.ComponentProps<typeof Ionicons>['name']; color: string; bg: string; tag: string } =>
  a.type === 'application/pdf' || /\.pdf$/i.test(a.name) ? { name: 'document-text', color: '#DC2626', bg: '#FEE2E2', tag: 'PDF' }
  : /\.docx?$/i.test(a.name) ? { name: 'document', color: '#2563EB', bg: '#DBEAFE', tag: 'DOC' }
  : { name: 'attach', color: colors.primary, bg: '#FFF1E3', tag: 'FILE' };

const DEFAULT_VISIT_TYPES = ['General', 'Vaccination', 'Surgery', 'Emergency', 'Follow Up'];
const supports = (d: Doctor, m: AppointmentMode) => (m === 'Online' ? d.capabilities.online : m === 'Home Care' ? d.capabilities.home : d.capabilities.clinic);

const Step = ({ n, title, hint, done }: { n: number; title: string; hint?: string; done?: boolean }) => (
  <View className="flex-row items-center gap-3 mb-3.5">
    <View className={cn('w-8 h-8 rounded-full items-center justify-center', done ? 'bg-green' : 'bg-primary')}>
      {done ? <Ionicons name="checkmark" size={16} color="#fff" /> : <Text className="text-white font-extrabold">{n}</Text>}
    </View>
    <View className="flex-1"><Text className={T.h2}>{title}</Text>{!!hint && <Text className={T.small}>{hint}</Text>}</View>
  </View>
);
const Section = ({ children }: { children: React.ReactNode }) => <View className="bg-white rounded-3xl border border-line p-4">{children}</View>;

export default function BookAppointmentScreen({ navigation, route }: any) {
  const { pets, upsertAppointment, refreshAppointments } = usePets();
  const { user } = useAuth();
  const { addresses, selectedAddressId, setSelectedAddressId, saveAddress } = useCart();
  const insets = useSafeAreaInsets();

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [docNote, setDocNote] = useState('');
  const [visitTypes, setVisitTypes] = useState<string[]>(DEFAULT_VISIT_TYPES);
  const [mode, setMode] = useState<AppointmentMode>('Clinic Visit');
  const [doctorId, setDoctorId] = useState<string>(route.params?.doctorId ?? '');
  const [search, setSearch] = useState('');
  const [day, setDay] = useState(DAYS[0].key);
  const [slot, setSlot] = useState<string | null>(null);
  const [petId, setPetId] = useState<string | undefined>(route.params?.petId ?? pets[0]?.id);
  const [visitType, setVisitType] = useState('');
  const [reason, setReason] = useState('');
  const [files, setFiles] = useState<Attach[]>([]);
  const [addrSheet, setAddrSheet] = useState(false);
  const [booking, setBooking] = useState(false);

  const pet = pets.find((p) => p.id === petId);
  const doc = doctors.find((d) => d.id === doctorId);
  const list = doctors.filter((d) => `${d.name} ${d.spec} ${d.clinic}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => a.distanceKm - b.distanceKm);
  const dayObj = DAYS.find((d) => d.key === day)!;
  const isHome = mode === 'Home Care';
  const steps = [!!mode, !!doc, !!slot, !!pet && !!visitType, ...(isHome ? [!!selectedAddressId] : [])];
  const doneCount = steps.filter(Boolean).length;

  // doctors near the user (the server only lists doctors within range of the coordinates we send)
  useEffect(() => {
    let live = true;
    (async () => {
      setLoadingDocs(true);
      const home = addresses.find((a) => a.id === selectedAddressId) ?? addresses.find((a) => a.isDefault);
      const coords = (await getCurrentCoords()) ?? (home?.latitude && home?.longitude ? { lat: home.latitude, lng: home.longitude } : null);
      if (!coords) { if (live) { setDocNote('Allow location access (or add an address) to see doctors near you.'); setLoadingDocs(false); } return; }
      try {
        const r = await appointmentsService.doctors(coords.lat, coords.lng);
        if (!live) return;
        setDoctors(r.doctors);
        setDocNote(r.doctors.length === 0 ? `No doctors found within ${r.maxDistanceKm} km.` : r.doctors.every((d) => d.onlineOnly) ? `No clinics within ${r.maxDistanceKm} km - showing doctors who offer online consultations.` : '');
        setDoctorId((cur) => (r.doctors.some((d) => d.id === cur) ? cur : r.doctors.find((d) => supports(d, 'Clinic Visit'))?.id ?? r.doctors[0]?.id ?? ''));
      } catch (e) { if (live) setDocNote(errorMessage(e)); }
      finally { if (live) setLoadingDocs(false); }
    })();
    appointmentsService.visitTypes().then((v) => live && v.length && setVisitTypes(v), () => {});
    return () => { live = false; };
  }, []);

  const pickMode = (m: AppointmentMode) => {
    setMode(m); setSlot(null);
    if (doc && !supports(doc, m)) { const first = doctors.find((d) => supports(d, m)); if (first) setDoctorId(first.id); }
  };
  /** Adds files to the list, enforcing the file-count and 5 MB-per-file limits. */
  const addFiles = (incoming: Attach[]) => {
    const room = MAX_FILES - files.length;
    const ok = incoming.filter((f) => !f.size || f.size <= MAX_BYTES);
    if (ok.length < incoming.length) toast.error('Some files were skipped - each file must be 5 MB or less.');
    if (ok.length > room) toast.info(`You can attach up to ${MAX_FILES} files.`);
    setFiles((cur) => [...cur, ...ok.slice(0, Math.max(0, room))]);
  };
  const toAttach = (a: ImagePicker.ImagePickerAsset): Attach => ({ uri: a.uri, name: a.fileName || a.uri.split('/').pop() || 'photo.jpg', type: a.mimeType || 'image/jpeg', size: a.fileSize });
  const pickPhotos = async () => {
    if (files.length >= MAX_FILES) return toast.info(`You can attach up to ${MAX_FILES} files.`);
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: Math.max(1, MAX_FILES - files.length), quality: 0.7 });
    if (!res.canceled) addFiles(res.assets.map(toAttach));
  };
  const takePhoto = async () => {
    if (files.length >= MAX_FILES) return toast.info(`You can attach up to ${MAX_FILES} files.`);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return toast.error('Camera permission is needed to take a photo.');
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!res.canceled) addFiles(res.assets.map(toAttach));
  };
  const pickDocuments = async () => {
    if (files.length >= MAX_FILES) return toast.info(`You can attach up to ${MAX_FILES} files.`);
    const res = await DocumentPicker.getDocumentAsync({ type: DOC_TYPES, multiple: true, copyToCacheDirectory: true });
    if (res.canceled) return;
    addFiles(res.assets.map((d) => ({ uri: d.uri, name: d.name, type: d.mimeType || 'application/octet-stream', size: d.size })));
  };

  const book = async () => {
    if (!pet) return toast.error('Please choose a pet.');
    if (!doc) return toast.error('Please choose a doctor.');
    if (!slot) return toast.error('Please choose a date and time.');
    if (!visitType) return toast.error("Please choose what the visit is for.");
    const address = addresses.find((a) => a.id === selectedAddressId);
    if (mode === 'Home Care' && !address) return WonPetsAlert.error('Home location required', 'Please choose or add a home location for this visit.');
    if (booking) return;
    setBooking(true);
    try {
      // 1) server validates the slot and creates the Razorpay order, 2) pay, 3) server verifies and books
      const init = await appointmentsService.initiatePayment({
        petId: pet.id, doctorId: doc.id, date: day, time: slot, mode, visitType, reason: reason.trim(),
        addressId: mode === 'Home Care' ? address?.id : undefined,
        documents: files.map(({ uri, name, type }) => ({ uri, name, type })),
      });
      const paid = await payWithRazorpay({
        keyId: init.keyId, orderId: init.order.id, amountPaise: init.order.amount,
        title: 'WON PET PRO', description: `Consultation with ${doc.name}`,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
      });
      const appt = await appointmentsService.verifyPayment(paid);
      upsertAppointment(appt);
      refreshAppointments();
      WonPetsAlert.success('Appointment Confirmed', 'Payment received and your visit is confirmed.');
      navigation.replace('AppointmentDetail', { id: appt.id });
    } catch (e) {
      if (e instanceof PaymentCancelled) toast.info('Payment cancelled - no appointment was booked.');
      else WonPetsAlert.error('Booking failed', errorMessage(e));
    } finally {
      setBooking(false);
    }
  };

  return (
    <View className="flex-1 bg-cream">
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4 pb-8" keyboardShouldPersistTaps="handled">
        <View className="gap-2.5">
          <View><Text className="text-[26px] font-black text-ink">Book a visit</Text><Text className={T.body}>Verified vets, confirmed instantly after payment.</Text></View>
          <View className="flex-row gap-1.5">{steps.map((ok, i) => <View key={i} className={cn('flex-1 h-1.5 rounded-full', ok ? 'bg-primary' : 'bg-orange-100')} />)}</View>
          <Text className={T.small}>{doneCount} of {steps.length} steps complete</Text>
        </View>

        <Section>
          <Step n={1} title="Appointment type" done />
          <View className="flex-row flex-wrap gap-2.5">
            {types.map((t) => {
              const on = mode === t.mode; const red = t.mode === 'Emergency';
              return (
                <Pressable key={t.mode} onPress={() => pickMode(t.mode)} className={cn('flex-row items-center gap-2.5 p-3 rounded-2xl border-[1.5px]', on ? (red ? 'border-red bg-red-soft' : 'border-primary bg-primary-soft') : 'border-line bg-white')} style={{ width: '48.5%' }}>
                  <View className={cn('w-9 h-9 rounded-xl items-center justify-center', on ? (red ? 'bg-red' : 'bg-primary') : 'bg-cream')}><Ionicons name={t.icon} size={17} color={on ? '#fff' : colors.muted} /></View>
                  <View className="flex-1"><Text className={cn('font-bold text-[13px]', on ? 'text-ink' : 'text-muted')}>{t.mode}</Text><Text className="text-[10px] text-muted">{t.desc}</Text></View>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section>
          <Step n={2} title="Choose doctor" done={!!doc} hint={mode === 'Online' ? 'Doctors available for video consultation' : 'Nearest doctors first'} />
          <View className="flex-row items-center gap-2 bg-cream border border-line rounded-2xl px-3 mb-3">
            <Ionicons name="search-outline" size={18} color={colors.muted} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search doctor, speciality or clinic" placeholderTextColor="#B8AEA5" className="flex-1 py-3 text-ink" />
          </View>
          <View className="gap-2.5">
            {loadingDocs && <ActivityIndicator color={colors.primary} />}
            {!!docNote && !loadingDocs && <Text className={T.body + ' text-center py-2'}>{docNote}</Text>}
            {!loadingDocs && !docNote && list.length === 0 && <Text className={T.body + ' text-center py-4'}>No doctors match your search.</Text>}
            {list.map((d) => {
              const ok = supports(d, mode); const on = doctorId === d.id;
              return (
                <Pressable key={d.id} disabled={!ok} onPress={() => { setDoctorId(d.id); setSlot(null); }} className={cn('flex-row items-center gap-3 p-3 rounded-2xl border-[1.5px]', on ? 'border-primary bg-primary-soft' : 'border-line bg-white', !ok && 'opacity-50')}>
                  <View>
                    <Avatar square image={d.image} emoji={d.emoji} size={54} />
                    {on && <View className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary items-center justify-center border-2 border-white"><Ionicons name="checkmark" size={11} color="#fff" /></View>}
                  </View>
                  <View className="flex-1 gap-0.5">
                    <Text className={T.h3} numberOfLines={1}>{d.name}</Text>
                    <Text className={T.small} numberOfLines={1}>{d.spec}{d.experience ? ` · ${d.experience}` : ''}</Text>
                    <View className="flex-row items-center gap-1">
                      <Ionicons name="location-outline" size={12} color={colors.muted} />
                      <Text className={T.small + ' flex-1'} numberOfLines={1}>{ok ? `${d.clinic} · ${d.distanceKm} km` : `Not available for ${mode}`}</Text>
                    </View>
                  </View>
                  <View className="items-end gap-1">
                    <Text className="font-black text-primary-dark">{inr(d.fee)}</Text>
                    {!!d.rating && <View className="flex-row items-center gap-0.5"><Ionicons name="star" size={11} color={colors.yellow} /><Text className="text-[11px] font-bold text-ink">{d.rating}</Text></View>}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Section>
          <Step n={3} title="Date & time" done={!!slot} hint={doc ? `With ${doc.name}` : 'Choose a doctor first'} />
          <SlotPicker day={day} slot={slot} onDay={setDay} onSlot={setSlot} doctorId={doctorId || undefined} />
        </Section>

        {isHome && (
          <Section>
            <Step n={4} title="Home location" done={!!selectedAddressId} hint="Where should the doctor come?" />
            <View className="gap-2.5">
              {addresses.map((a) => {
                const on = a.id === selectedAddressId;
                return (
                  <Pressable key={a.id} onPress={() => setSelectedAddressId(a.id)} className={cn('flex-row gap-3 rounded-2xl border-[1.5px] p-3.5', on ? 'border-primary bg-primary-soft' : 'border-line bg-white')}>
                    <View className={cn('w-5 h-5 rounded-full border-2 items-center justify-center mt-0.5', on ? 'border-primary' : 'border-gray-300')}>{on && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}</View>
                    <View className="flex-1"><Text className={T.h3}>{a.addressType} · {a.fullName}</Text><Text className="text-sm text-ink leading-5">{a.doorNo}, {a.area}</Text></View>
                  </Pressable>
                );
              })}
              <Button variant="outline" title="Add new address" icon={<Ionicons name="add" size={18} color={colors.primary} />} onPress={() => setAddrSheet(true)} />
            </View>
          </Section>
        )}

        <Section>
          <Step n={isHome ? 5 : 4} title="Pet & visit details" done={!!pet && !!visitType} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 mb-4">
            {pets.map((p) => (
              <Pressable key={p.id} onPress={() => setPetId(p.id)} className={cn('items-center p-3 rounded-2xl border-[1.5px] w-24', petId === p.id ? 'border-primary bg-primary-soft' : 'border-line bg-white')}>
                <PetAvatar emoji={p.emoji} image={p.image} size={52} /><Text className="font-bold text-ink mt-1.5" numberOfLines={1}>{p.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text className="font-bold text-ink mb-2">What's this visit for?</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">{visitTypes.map((v) => <Chip key={v} label={v} active={visitType === v} onPress={() => setVisitType(v)} />)}</View>
          <Field label="Reason / symptoms (optional)" value={reason} onChangeText={setReason} placeholder="Describe symptoms, concerns or questions…" multiline numberOfLines={3} />
        </Section>

        <Section>
          <Step n={isHome ? 6 : 5} title="Photos & documents" done={files.length > 0} hint={`Optional · up to ${MAX_FILES} files, 5 MB each`} />
          <View className="flex-row gap-2.5">
            {([
              ['images-outline', 'Gallery', pickPhotos],
              ['camera-outline', 'Camera', takePhoto],
              ['document-attach-outline', 'Document', pickDocuments],
            ] as const).map(([icon, label, fn]) => (
              <Pressable key={label} onPress={fn} className="flex-1 items-center gap-1.5 py-3.5 rounded-2xl border-[1.5px] border-dashed border-primary bg-primary-soft active:opacity-80">
                <Ionicons name={icon} size={22} color={colors.primary} />
                <Text className="text-[12px] font-extrabold text-primary">{label}</Text>
              </Pressable>
            ))}
          </View>
          <Text className={T.small + ' mt-2'}>Add symptom photos, lab reports, vaccination cards or earlier prescriptions (PDF, Word or image).</Text>

          {files.length > 0 && (
            <View className="mt-3.5 gap-2.5">
              <View className="flex-row items-center justify-between">
                <Text className="font-bold text-ink">Attached ({files.length}/{MAX_FILES})</Text>
                <Pressable onPress={() => setFiles([])} hitSlop={8}><Text className="text-red font-bold text-[13px]">Remove all</Text></Pressable>
              </View>
              {files.some(isImg) && (
                <View className="flex-row flex-wrap gap-2.5">
                  {files.filter(isImg).map((f) => (
                    <View key={f.uri}>
                      <Image source={{ uri: f.uri }} className="w-20 h-20 rounded-2xl" />
                      <Pressable onPress={() => setFiles((c) => c.filter((x) => x.uri !== f.uri))} hitSlop={6} className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red items-center justify-center border-2 border-white"><Ionicons name="close" size={12} color="#fff" /></Pressable>
                    </View>
                  ))}
                </View>
              )}
              {files.filter((f) => !isImg(f)).map((f) => {
                const ic = docIcon(f);
                return (
                  <View key={f.uri} className="flex-row items-center gap-3 bg-cream border border-line rounded-2xl p-2.5">
                    <View style={{ backgroundColor: ic.bg }} className="w-11 h-11 rounded-xl items-center justify-center">
                      <Ionicons name={ic.name} size={20} color={ic.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[13px] font-bold text-ink" numberOfLines={1}>{f.name}</Text>
                      <Text className={T.small}>{ic.tag}{f.size ? ` · ${fmtSize(f.size)}` : ''}</Text>
                    </View>
                    <Pressable onPress={() => setFiles((c) => c.filter((x) => x.uri !== f.uri))} hitSlop={8} className="w-8 h-8 rounded-full bg-white border border-line items-center justify-center"><Ionicons name="trash-outline" size={16} color={colors.red} /></Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </Section>

        <Card className="gap-2.5">
          <Text className={T.h2}>Booking summary</Text>
          {([['Type', mode], ['Doctor', doc?.name ?? 'Not selected'], ['Date & time', slot ? `${ddmm(dayObj.date)} · ${to12h(slot)}` : 'Not selected'], ['Pet', pet?.name ?? 'Not selected'], ['Visit for', visitType || 'Not selected'], ['Attachments', files.length ? `${files.length} file${files.length === 1 ? '' : 's'}` : 'None']] as [string, string][]).map(([k, v]) => (
            <View key={k} className="flex-row justify-between gap-3"><Text className={T.body}>{k}</Text><Text className={cn(T.h3, 'flex-shrink text-right')}>{v}</Text></View>
          ))}
          <View className="flex-row justify-between pt-2.5 border-t border-orange-100"><Text className={T.h3}>Consultation fee</Text><Text className="text-lg font-black text-primary-dark">{inr(doc?.fee ?? 0)}</Text></View>
          <View className="flex-row items-start gap-2 bg-green-soft rounded-xl p-2.5"><Ionicons name="shield-checkmark" size={15} color={colors.green} /><Text className="text-xs text-ink flex-1">Pay securely with UPI, cards, netbanking or wallets. Your visit is confirmed instantly once payment succeeds.</Text></View>
        </Card>
      </ScrollView>

      <View style={{ paddingBottom: Math.max(insets.bottom, 12) }} className="bg-white border-t border-line px-4 pt-3 flex-row items-center gap-3">
        <View><Text className={T.small}>Total</Text><Text className="text-[22px] font-black text-primary-dark leading-7">{inr(doc?.fee ?? 0)}</Text></View>
        <Button className="flex-1" disabled={booking || !doc} title={booking ? 'Booking…' : 'Pay & Book'} icon={<Ionicons name="lock-closed" size={16} color="#fff" />} onPress={book} />
      </View>
      <AddressSheet visible={addrSheet} onClose={() => setAddrSheet(false)} onSave={saveAddress} />
    </View>
  );
}