import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Keyboard, KeyboardAvoidingView, NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients } from '../../theme';
import { cn } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { assistantService, AssistantLink, AssistantProduct } from '../../services/assistant.service';
import { openAssistantPath } from '../../utils/assistantLinks';
import type { AppRole } from '../../services/mappers';
import { to12h } from '../../services/mappers';
import { errorMessage } from '../../services/api';
import { appointmentsService, Slot } from '../../services/appointments.service';
import { addressService } from '../../services/store.service';
import { doctorService } from '../../services/doctor.service';
import { smService, courierHandles, OrderAction, SMOrder, SMProduct } from '../../services/storeManager.service';
import { payWithRazorpay, PaymentCancelled } from '../../utils/razorpay';
import { getCurrentCoords } from '../../utils/location';
import DateStrip, { buildDays, isoLocal } from '../../components/common/DateStrip';
import { toast } from '../../components/WonPetsAlert';
import { usePets } from '../../context/PetsContext';
import { useCart } from '../../context/CartContext';
import type { Address, Appointment, AppointmentMode, Doctor, Pet } from '../../data/mock';

type IconName = keyof typeof Ionicons.glyphMap;
type Msg = {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  /** greeting, guided steps and errors: shown in the chat but NOT sent to the AI as history */
  local?: boolean;
  links?: AssistantLink[];
  products?: AssistantProduct[];
  retry?: string;
  /** interactive action cards shown under the bot message */
  widget?: Widget['kind'];
};

/* ------------------------- role content (same wording as the web WonPet AI) ------------------------- */
const GREETING: Record<AppRole, string> = {
  user: "Hi 👋 I'm WonPet AI. I can book, cancel and reschedule appointments right here, add products to your cart, and help with pet care, adoption and more.",
  doctor: "Hi Doctor 👋 I'm WonPet AI. I can approve requests, start and complete consultations, and answer about patients, prescriptions, follow-ups and earnings, or help with clinical reference and notes.",
  store_manager: "Hi 👋 I'm WonPet AI. I can accept, ship and deliver orders, update stock, and answer about sales, best sellers and reviews.",
};
const WELCOME: Record<AppRole, string> = {
  user: 'Ask me anything about your pets.',
  doctor: 'Your schedule, patients and earnings, plus clinical help.',
  store_manager: 'Your orders, stock and sales, plus help with listings.',
};
const ROLE_LABEL: Record<AppRole, string> = { user: 'Pet care assistant', doctor: 'Doctor assistant', store_manager: 'Store assistant' };
const PLACEHOLDER: Record<AppRole, string> = {
  user: 'Ask WonPet AI anything...',
  doctor: 'Ask about appointments, patients or earnings...',
  store_manager: 'Ask about orders, stock, sales or reviews...',
};
const DISCLAIMER: Record<AppRole, string> = {
  user: 'WonPet AI can make mistakes - verify important medical information with a veterinarian.',
  doctor: "AI suggestions support, not replace, your clinical judgment. Verify dosages before prescribing.",
  store_manager: 'Figures come from your store data. Check Reports for full detail.',
};
type Quick = { title: string; icon: IconName; prompt: string; intent?: string };
const QUICK: Record<AppRole, Quick[]> = {
  user: [
    { title: 'Book Appointment', icon: 'calendar-outline', prompt: 'I want to book an appointment', intent: 'book_appointment' },
    { title: 'Pet Care', icon: 'heart-outline', prompt: 'Give me pet care tips' },
    { title: 'Pet Store', icon: 'bag-handle-outline', prompt: 'Show pet products' },
    { title: 'My Orders', icon: 'receipt-outline', prompt: 'Track my order' },
    { title: 'Reschedule', icon: 'calendar-number-outline', prompt: 'Reschedule my appointment' },
    { title: 'Cancel Visit', icon: 'close-circle-outline', prompt: 'Cancel my appointment' },
  ],
  doctor: [
    { title: "Today's Appointments", icon: 'calendar-outline', prompt: "Show today's appointments" },
    { title: 'Recent Patients', icon: 'paw-outline', prompt: 'Show my recent patients' },
    { title: 'Prescriptions', icon: 'medkit-outline', prompt: 'Show my recent prescriptions' },
    { title: 'My Earnings', icon: 'cash-outline', prompt: 'Show my earnings' },
    { title: 'Pending Approvals', icon: 'checkmark-done-outline', prompt: 'Show pending approvals' },
    { title: 'Follow-ups', icon: 'time-outline', prompt: 'Show follow-up reminders' },
  ],
  store_manager: [
    { title: "Today's Orders", icon: 'clipboard-outline', prompt: "Show today's orders" },
    { title: 'My Products', icon: 'bag-handle-outline', prompt: 'Show my products' },
    { title: 'Low Stock', icon: 'cube-outline', prompt: 'Show low stock products' },
    { title: 'Sales', icon: 'cash-outline', prompt: "Today's sales summary" },
    { title: 'Pending Orders', icon: 'time-outline', prompt: 'Show pending orders' },
    { title: 'Update Stock', icon: 'add-circle-outline', prompt: 'Update stock for low stock products' },
  ],
};
const SUGGESTED: Record<AppRole, string[]> = {
  user: ['My appointments', 'Cancel appointment', 'Reschedule appointment', 'Find nearby doctor', 'Track my order', 'Best food for puppies', 'Adopt a pet'],
  doctor: ["Today's appointments", 'Pending approvals', 'Upcoming consultations', 'Follow-up reminders', 'Vaccination guidelines', 'Prescription template'],
  store_manager: ['Pending orders', 'Low stock products', 'Best selling products', 'Inventory report', 'Customer reviews', 'Unanswered questions'],
};

/* ------------------------------ in-chat actions ------------------------------
 * Everything the web WonPet AI finishes inside the chat is finished here too: booking (pay included), cancel /
 * reschedule, add to cart, doctor approvals and consultation steps, store order handling and stock updates.
 * They call the same endpoints as the normal screens, so slot locking, fees and payment checks stay on the server. */
type Widget = { kind: 'cancel' | 'resched' | 'dr_pending' | 'dr_today' | 'sm_orders' | 'sm_stock' };

const BOOK_RE = /\b(book|schedule|reserve|arrange)\b[\s\S]*\b(appointment|consultation|visit|doctor|vet|slot)\b|\b(appointment|consultation)\b[\s\S]*\b(book|schedule|reserve)\b|^\s*book\b/i;
const FIND_DOC_RE = /\b(find|show|search|need|looking for)\b[\s\S]*\b(doctors?|vets?|veterinarians?)\b[\s\S]*\b(near|nearby|nearest|close)\b|\b(nearby|nearest)\b[\s\S]*\b(doctors?|vets?|veterinarians?)\b/i;
const CANCEL_RE = /\b(cancel|call off)\b[\s\S]*\b(appointments?|visit|booking|consultation)\b/i;
const RESCHED_RE = /\b(reschedule|postpone)\b|\b(change|move|shift)\b[\s\S]*\b(appointments?|visit|booking|consultation)\b/i;

/** What the typed message asks for. "local" ones run entirely in the chat; the rest add action cards to the AI's answer. */
function detectAction(role: AppRole, text: string, intent?: string): { local?: 'book' | Widget['kind']; widget?: Widget['kind'] } {
  if (role === 'user') {
    if (intent === 'book_appointment') return { local: 'book' };
    if (CANCEL_RE.test(text)) return { local: 'cancel' };
    if (RESCHED_RE.test(text)) return { local: 'resched' };
    if (BOOK_RE.test(text) || FIND_DOC_RE.test(text)) return { local: 'book' };
  }
  if (role === 'doctor') {
    if (/\b(pending|approvals?|approve|accept|decline|requests?)\b/i.test(text) && !/earning|revenue/i.test(text)) return { widget: 'dr_pending' };
    if (/\b(today'?s?|upcoming|start|complete|finish)\b[\s\S]*\b(appointments?|consultations?|schedule|visits?)\b/i.test(text)) return { widget: 'dr_today' };
  }
  if (role === 'store_manager') {
    if (/\b(low stock|out of stock|restock|update stock|stock)\b/i.test(text)) return { widget: 'sm_stock' };
    if (/\borders?\b/i.test(text) && /\b(pending|new|today'?s?|process|processing|ship|shipped|deliver|accept|manage|update|status)\b/i.test(text)) return { widget: 'sm_orders' };
  }
  return {};
}

const Pill = ({ label, onPress, on, disabled, danger }: { label: string; onPress: () => void; on?: boolean; disabled?: boolean; danger?: boolean }) => (
  <Pressable disabled={disabled} onPress={onPress} accessibilityRole="button" className={cn('px-3 py-1.5 rounded-full border active:opacity-80', on ? 'bg-primary border-primary' : danger ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200', disabled && 'opacity-50')}>
    <Text style={{ fontSize: 12, fontWeight: '700', color: on ? '#fff' : danger ? '#DC2626' : colors.primaryDark }}>{label}</Text>
  </Pressable>
);
const Panel = ({ children }: { children: React.ReactNode }) => (
  <View style={{ marginTop: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 16, padding: 10, gap: 8 }}>{children}</View>
);
const Row = ({ title, sub, children, done }: { title: string; sub?: string; children?: React.ReactNode; done?: string }) => (
  <View style={{ backgroundColor: '#FFFBF7', borderWidth: 1, borderColor: '#FDE6D2', borderRadius: 14, padding: 10, gap: 6 }}>
    <Text numberOfLines={2} style={{ fontSize: 13, fontWeight: '800', color: colors.ink }}>{title}</Text>
    {!!sub && <Text style={{ fontSize: 12, color: '#64748B' }}>{sub}</Text>}
    {done ? <Text style={{ fontSize: 12, fontWeight: '800', color: '#16A34A' }}>{done}</Text> : !!children && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{children}</View>}
  </View>
);
const Loading = () => <View style={{ paddingVertical: 10 }}><ActivityIndicator color={colors.primary} /></View>;
const Note = ({ text }: { text: string }) => <Text style={{ fontSize: 12.5, color: '#64748B', lineHeight: 18 }}>{text}</Text>;
const todayIso = () => isoLocal(new Date());
const prettyDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

/** Date strip + the doctor's free times for the chosen day. Used by booking and by reschedule. */
function SlotChooser({ doctorId, onPick }: { doctorId: string; onPick: (isoDate: string, time24: string) => void }) {
  const days = useMemo(() => buildDays(10), []);
  const [day, setDay] = useState(days[0].key);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let live = true;
    setLoading(true); setNote('');
    appointmentsService.slots(doctorId, day).then(
      (r) => { if (!live) return; const free = r.slots.filter((s) => !s.isBreak && s.available); setSlots(free); setNote(free.length ? '' : r.message || 'No free slots on this day. Please pick another day.'); },
      (e) => { if (live) { setSlots([]); setNote(errorMessage(e)); } },
    ).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [doctorId, day]);
  return (
    <View style={{ gap: 8 }}>
      <DateStrip days={days} value={day} onChange={setDay} />
      {loading ? <Loading /> : note ? <Note text={note} /> : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {slots.map((s) => <Pill key={s.time} label={to12h(s.time)} onPress={() => onPick(day, s.time)} />)}
        </View>
      )}
    </View>
  );
}

/* ------------------------------ guided booking (pet owner) ------------------------------ */
const MODES: { mode: AppointmentMode; label: string }[] = [
  { mode: 'Clinic Visit', label: '🏥 Clinic visit' }, { mode: 'Online', label: '📹 Online consult' },
  { mode: 'Home Care', label: '🏠 Home visit' }, { mode: 'Emergency', label: '🚨 Emergency' },
];
const DEFAULT_VISIT_TYPES = ['General', 'Vaccination', 'Surgery', 'Follow Up'];
const supports = (d: Doctor, m: AppointmentMode) => (m === 'Online' ? d.capabilities.online : m === 'Home Care' ? d.capabilities.home : d.capabilities.clinic);
type AddBot = (text: string, extra?: Partial<Msg>) => void;
type Step = 'pet' | 'mode' | 'doctor' | 'slot' | 'visit' | 'address' | 'confirm' | 'paying';

function BookingFlow({ pets, user, addBot, addUser, onEnd, onBooked }: {
  pets: Pet[]; user: any; addBot: AddBot; addUser: (t: string) => void; onEnd: () => void; onBooked: (a: Appointment) => void;
}) {
  const [step, setStep] = useState<Step>('pet');
  const [pet, setPet] = useState<Pet>();
  const [mode, setMode] = useState<AppointmentMode>();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doc, setDoc] = useState<Doctor>();
  const [when, setWhen] = useState<{ date: string; time: string }>();
  const [visitTypes, setVisitTypes] = useState<string[]>(DEFAULT_VISIT_TYPES);
  const [visit, setVisit] = useState('');
  const [addrs, setAddrs] = useState<Address[]>([]);
  const [addr, setAddr] = useState<Address>();
  const [loading, setLoading] = useState(false);

  const choosePet = (p: Pet) => { setPet(p); addBot(`Booking for ${p.name}. How would you like the visit?`); setStep('mode'); };

  useEffect(() => {
    if (!pets.length) { addBot("You haven't added a pet yet. Add your pet first, then I can book a visit for them.", { links: [{ label: 'Add a pet', path: '/owner/pets' }] }); onEnd(); return; }
    if (pets.length === 1) choosePet(pets[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickMode = async (m: AppointmentMode) => {
    addUser(m); setMode(m); setStep('doctor'); setLoading(true);
    try {
      const saved = await addressService.list().catch(() => [] as Address[]);
      setAddrs(saved);
      const home = saved.find((a) => a.isDefault) ?? saved[0];
      const coords = (await getCurrentCoords({ prompt: 'guided' })) ?? (home?.latitude && home?.longitude ? { lat: home.latitude, lng: home.longitude } : null);
      if (!coords) { addBot('I need your location to find nearby doctors. Allow location access (or save an address) and try again.'); setStep('mode'); return; }
      const r = await appointmentsService.doctors(coords.lat, coords.lng);
      const list = r.doctors.filter((d) => supports(d, m)).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 8);
      if (!list.length) { addBot(`I couldn't find a doctor for ${m} within ${r.maxDistanceKm} km. Try a different visit type.`); setStep('mode'); return; }
      appointmentsService.visitTypes().then((v) => v.length && setVisitTypes(v), () => {});
      setDoctors(list);
      addBot(r.doctors.every((d) => d.onlineOnly) ? 'No clinics are nearby, so these are doctors who offer online consultations. Pick one.' : `Here are doctors near you for ${m}. Pick one.`);
    } catch (e) { addBot(`I couldn't load doctors. ${errorMessage(e)}`); setStep('mode'); } finally { setLoading(false); }
  };
  const pickDoctor = (d: Doctor) => { addUser(d.name); setDoc(d); addBot(`Great, ${d.name}${d.fee ? ` (₹${d.fee})` : ''}. Pick a day and a time.`); setStep('slot'); };
  const pickSlot = (date: string, time: string) => { addUser(`${prettyDay(date)}, ${to12h(time)}`); setWhen({ date, time }); addBot('What is the visit for?'); setStep('visit'); };
  const pickVisit = (v: string) => {
    addUser(v); setVisit(v);
    if (mode !== 'Home Care') { setStep('confirm'); summaryLater(v); return; }
    if (!addrs.length) { addBot('Home visits need a saved address. Add one from the booking page or store checkout, then try again.', { links: [{ label: 'Book appointment', path: '/owner/appointments/book' }] }); onEnd(); return; }
    if (addrs.length === 1) { setAddr(addrs[0]); setStep('confirm'); summaryLater(v, addrs[0]); return; }
    addBot('Which address should the vet visit?'); setStep('address');
  };
  // the visit type is passed in because the state has not updated yet
  const summaryLater = (v: string, a?: Address) => {
    addBot(`**Booking summary**\n- Pet: ${pet?.name}\n- Vet: ${doc?.name}${doc?.clinic ? ` (${doc.clinic})` : ''}\n- Visit: ${mode}, ${v}\n- When: ${when ? `${prettyDay(when.date)}, ${to12h(when.time)}` : ''}${a ? `\n- Address: ${a.doorNo ? `${a.doorNo}, ` : ''}${a.area}` : ''}\n- Fee: ₹${doc?.fee ?? 0}\n\nTap below to pay and confirm.`);
  };
  const pickAddr = (a: Address) => { addUser(`${a.addressType}: ${a.area}`); setAddr(a); setStep('confirm'); summaryLater(visit, a); };

  const pay = async () => {
    if (!pet || !doc || !when || !mode) return;
    setStep('paying');
    try {
      const init = await appointmentsService.initiatePayment({ petId: pet.id, doctorId: doc.id, date: when.date, time: when.time, mode, visitType: visit, addressId: mode === 'Home Care' ? addr?.id : undefined });
      const paid = await payWithRazorpay({
        keyId: init.keyId, orderId: init.order.id, amountPaise: init.order.amount, title: 'WON PET PRO', description: `Consultation with ${doc.name}`,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
      });
      const appt = await appointmentsService.verifyPayment(paid);
      onBooked(appt);
      addBot(`✅ Payment received and your appointment is confirmed.\n\n**${pet.name}** with **${doc.name}** on ${prettyDay(when.date)} at ${to12h(when.time)}.`, { links: [{ label: 'View appointments', path: '/owner/appointments' }] });
      onEnd();
    } catch (e) {
      if (e instanceof PaymentCancelled) { addBot('Payment was cancelled, so nothing was booked. Tap below whenever you want to try again.'); setStep('confirm'); return; }
      const msg = errorMessage(e);
      addBot(`I couldn't complete the booking. ${msg}`);
      setStep(/slot|booked|available|taken/i.test(msg) ? 'slot' : 'confirm');
    }
  };

  const cancel = () => { addBot("Okay, I've cancelled the booking. Anything else I can help with?"); onEnd(); };

  return (
    <View style={{ marginBottom: 12, marginLeft: 34 }}>
      <Panel>
        {step === 'pet' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{pets.map((p) => <Pill key={p.id} label={`${p.emoji} ${p.name}`} onPress={() => { addUser(p.name); choosePet(p); }} />)}</View>}
        {step === 'mode' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{MODES.map((m) => <Pill key={m.mode} label={m.label} onPress={() => pickMode(m.mode)} />)}</View>}
        {step === 'doctor' && (loading ? <Loading /> : doctors.map((d) => (
          <Pressable key={d.id} onPress={() => pickDoctor(d)} className="flex-row items-center gap-2.5 bg-orange-50 border border-orange-100 rounded-2xl p-2.5 active:opacity-80">
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '800', color: colors.ink }}>{d.name}</Text>
              <Text numberOfLines={1} style={{ fontSize: 11.5, color: '#64748B' }}>{[d.spec, d.clinic].filter(Boolean).join(' • ')}</Text>
              <Text style={{ fontSize: 11.5, color: '#64748B' }}>{d.distanceKm ? `${d.distanceKm.toFixed(1)} km • ` : ''}{d.rating ? `★ ${d.rating} • ` : ''}₹{d.fee}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
          </Pressable>
        )))}
        {step === 'slot' && doc && <SlotChooser doctorId={doc.id} onPick={pickSlot} />}
        {step === 'visit' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>{visitTypes.map((v) => <Pill key={v} label={v} onPress={() => pickVisit(v)} />)}</View>}
        {step === 'address' && <View style={{ gap: 6 }}>{addrs.map((a) => <Pill key={a.id} label={`${a.addressType}: ${a.area}`} onPress={() => pickAddr(a)} />)}</View>}
        {step === 'confirm' && <Pill on label={`Pay ₹${doc?.fee ?? 0} & confirm`} onPress={pay} />}
        {step === 'paying' && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><ActivityIndicator color={colors.primary} /><Note text="Completing your payment..." /></View>}
        {step !== 'paying' && <View style={{ flexDirection: 'row' }}><Pill danger label="Cancel booking" onPress={cancel} /></View>}
      </Panel>
    </View>
  );
}

/* ------------------------------ pet owner: cancel / reschedule ------------------------------ */
function OwnerAppointmentCards({ kind, cancelAppointment, rescheduleAppointment }: {
  kind: 'cancel' | 'resched';
  cancelAppointment?: (id: string) => Promise<boolean>; rescheduleAppointment?: (id: string, p: { isoDate: string; time: string }) => Promise<boolean>;
}) {
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<Record<string, string>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    appointmentsService.list().then(
      (l) => setItems(l.filter((a) => (a.status === 'Pending' || a.status === 'Confirmed') && (a.isoDate || '') >= todayIso()).sort((a, b) => `${a.isoDate}${a.time24}`.localeCompare(`${b.isoDate}${b.time24}`)).slice(0, 8)),
      (e) => setErr(errorMessage(e)),
    );
  }, []);
  const doCancel = (a: Appointment) => Alert.alert('Cancel appointment?', `${a.pet} with ${a.doctor ?? 'the vet'} on ${a.date}, ${a.time}.`, [
    { text: 'Keep it', style: 'cancel' },
    { text: 'Cancel appointment', style: 'destructive', onPress: async () => { setBusy(a.id); const ok = await cancelAppointment?.(a.id); setBusy(null); if (ok) setDone((d) => ({ ...d, [a.id]: '✓ Appointment cancelled' })); } },
  ]);
  const doResched = async (a: Appointment, date: string, time: string) => {
    setBusy(a.id);
    const ok = await rescheduleAppointment?.(a.id, { isoDate: date, time });
    setBusy(null); setOpen(null);
    if (ok) setDone((d) => ({ ...d, [a.id]: `✓ Reschedule requested for ${prettyDay(date)}, ${to12h(time)}. Your vet will confirm.` }));
  };
  return (
    <Panel>
      {err ? <Note text={err} /> : !items ? <Loading /> : !items.length ? <Note text="You have no upcoming appointments to change." /> : items.map((a) => (
        <Row key={a.id} title={`${a.pet} • ${a.doctor ?? 'Vet'}`} sub={`${a.date}, ${a.time} • ${a.mode} • ${a.status}`} done={done[a.id]}>
          {kind === 'cancel'
            ? <Pill danger disabled={busy === a.id} label={busy === a.id ? 'Cancelling...' : 'Cancel appointment'} onPress={() => doCancel(a)} />
            : <Pill disabled={busy === a.id || !a.doctorId} label={open === a.id ? 'Close' : 'Choose new time'} onPress={() => setOpen(open === a.id ? null : a.id)} />}
          {kind === 'resched' && open === a.id && !!a.doctorId && <View style={{ width: '100%' }}><SlotChooser doctorId={a.doctorId} onPick={(d, t) => doResched(a, d, t)} /></View>}
        </Row>
      ))}
    </Panel>
  );
}

/* ------------------------------ doctor: approvals and consultation steps ------------------------------ */
function DoctorAppointmentCards({ kind }: { kind: 'dr_pending' | 'dr_today' }) {
  const [items, setItems] = useState<Appointment[] | null>(null);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    (kind === 'dr_pending' ? doctorService.pending() : doctorService.day(todayIso())).then(
      (l) => setItems(l.filter((a) => a.status !== 'Cancelled' && a.status !== 'Completed').slice(0, 10)),
      (e) => setErr(errorMessage(e)),
    );
  }, [kind]);
  const run = async (a: Appointment, label: string, fn: () => Promise<unknown>, next?: string) => {
    setBusy(a.id);
    try { await fn(); if (next) setStatus((s) => ({ ...s, [a.id]: next })); else setDone((d) => ({ ...d, [a.id]: label })); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(null); }
  };
  return (
    <Panel>
      {err ? <Note text={err} /> : !items ? <Loading /> : !items.length ? <Note text={kind === 'dr_pending' ? 'No appointments are waiting for your approval.' : 'No appointments left for today.'} /> : items.map((a) => {
        const st = status[a.id] ?? a.status;
        const off = busy === a.id;
        return (
          <Row key={a.id} title={`${a.pet}${a.owner ? ` • ${a.owner}` : ''}`} sub={`${a.date}, ${a.time} • ${a.mode} • ${st}${a.reason ? `\n${a.reason}` : ''}`} done={done[a.id]}>
            {st === 'Pending' && <>
              <Pill on disabled={off} label="Accept" onPress={() => run(a, '✓ Accepted', () => doctorService.accept(a.id), 'Confirmed')} />
              <Pill danger disabled={off} label="Decline" onPress={() => Alert.alert('Decline this appointment?', `${a.pet} on ${a.date}, ${a.time}.`, [{ text: 'Keep', style: 'cancel' }, { text: 'Decline', style: 'destructive', onPress: () => run(a, '✓ Declined', () => doctorService.decline(a.id)) }])} />
            </>}
            {st === 'Confirmed' && <Pill on disabled={off} label="Start consultation" onPress={() => run(a, '', () => doctorService.start(a.id), 'In Progress')} />}
            {st === 'In Progress' && <Pill on disabled={off} label="Mark completed" onPress={() => run(a, '✓ Completed', () => doctorService.complete(a.id))} />}
          </Row>
        );
      })}
    </Panel>
  );
}

/* ------------------------------ store manager: orders and stock ------------------------------ */
function StoreOrderCards() {
  const [items, setItems] = useState<SMOrder[] | null>(null);
  const [err, setErr] = useState('');
  const [done, setDone] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    smService.orders().then(
      (l) => setItems(l.filter((o) => ['Pending', 'Processing', 'Shipped'].includes(o.status)).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 8)),
      (e) => setErr(errorMessage(e)),
    );
  }, []);
  const run = async (o: SMOrder, action: OrderAction, next: string) => {
    setBusy(o.id);
    try { const r = await smService.orderAction(o.id, action); if (action === 'cancel') setDone((d) => ({ ...d, [o.id]: '✓ Order cancelled' })); else setStatus((s) => ({ ...s, [o.id]: next })); if (r?.warning) toast.info(r.warning); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(null); }
  };
  return (
    <Panel>
      {err ? <Note text={err} /> : !items ? <Loading /> : !items.length ? <Note text="No open orders right now." /> : items.map((o) => {
        const st = status[o.id] ?? o.status;
        const off = busy === o.id;
        return (
          <Row key={o.id} title={`#${o.orderId} • ${o.customer.name || 'Customer'}`} sub={`${o.items.length} item${o.items.length === 1 ? '' : 's'} • ₹${Number(o.total).toLocaleString('en-IN')} • ${o.paymentMethod} • ${st}`} done={done[o.id]}>
            {st === 'Pending' && <Pill on disabled={off} label="Accept order" onPress={() => run(o, 'accept', 'Processing')} />}
            {st === 'Processing' && <Pill on disabled={off} label="Mark shipped" onPress={() => run(o, 'ship', 'Shipped')} />}
            {st === 'Shipped' && (courierHandles(o) ? <Note text="The courier marks this delivered." /> : <Pill on disabled={off} label="Mark delivered" onPress={() => run(o, 'deliver', 'Delivered')} />)}
            {(st === 'Pending' || st === 'Processing') && <Pill danger disabled={off} label="Cancel" onPress={() => Alert.alert('Cancel this order?', `Order #${o.orderId} will be cancelled.`, [{ text: 'Keep', style: 'cancel' }, { text: 'Cancel order', style: 'destructive', onPress: () => run(o, 'cancel', 'Cancelled') }])} />}
          </Row>
        );
      })}
    </Panel>
  );
}

function StoreStockCards() {
  const [items, setItems] = useState<SMProduct[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    smService.products().then(
      (l) => setItems(l.filter((p) => p.itemType === 'product' && p.stock <= 10).sort((a, b) => a.stock - b.stock).slice(0, 8)),
      (e) => setErr(errorMessage(e)),
    );
  }, []);
  const add = async (p: SMProduct, n: number) => {
    setBusy(p.id);
    try { await smService.updateStock(p.id, p.stock + n, 'Active'); setItems((l) => (l || []).map((x) => (x.id === p.id ? { ...x, stock: x.stock + n } : x))); toast.success(`${p.name}: stock is now ${p.stock + n}`); } catch (e) { toast.error(errorMessage(e)); } finally { setBusy(null); }
  };
  return (
    <Panel>
      {err ? <Note text={err} /> : !items ? <Loading /> : !items.length ? <Note text="All your products have healthy stock." /> : items.map((p) => (
        <Row key={p.id} title={p.name} sub={p.stock <= 0 ? 'Out of stock' : `${p.stock} left`}>
          {[10, 25, 50].map((n) => <Pill key={n} disabled={busy === p.id} label={`+${n}`} onPress={() => add(p, n)} />)}
        </Row>
      ))}
    </Panel>
  );
}

/* ------------------------------------ helpers ------------------------------------ */
const now = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const greeting = (role: AppRole): Msg => ({ id: 'greeting', sender: 'bot', text: GREETING[role], time: now(), local: true });

// keeps the conversation when you leave the screen and come back (cleared by "New chat" or on a different account)
let saved: { key: string; messages: Msg[] } | null = null;

/** **bold**, `code` inside a line */
function Inline({ text, color }: { text: string; color: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') ? <Text key={i} style={{ fontWeight: '800', color }}>{p.slice(2, -2)}</Text>
        : p.startsWith('*') && p.endsWith('*') && p.length > 2 ? <Text key={i} style={{ fontStyle: 'italic' }}>{p.slice(1, -1)}</Text>
        : p.startsWith('`') ? <Text key={i} style={{ fontWeight: '700', color: colors.primaryDark }}>{p.slice(1, -1)}</Text>
        : <Text key={i}>{p}</Text>,
      )}
    </>
  );
}

/** Light markdown: paragraphs, "-" / "*" / "1." lists, "#" headings, bold. */
function RichText({ text, color }: { text: string; color: string }) {
  const lines = String(text).replace(/\r/g, '').split('\n');
  return (
    <View>
      {lines.map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return <View key={i} style={{ height: 6 }} />;
        const heading = line.match(/^#{1,6}\s+(.*)$/);
        if (heading) return <Text key={i} style={{ fontSize: 14, lineHeight: 20, fontWeight: '800', color, marginTop: 2 }}><Inline text={heading[1]} color={color} /></Text>;
        const bullet = line.match(/^\s*(?:[-*•])\s+(.*)$/);
        const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
        if (bullet || numbered) {
          return (
            <View key={i} style={{ flexDirection: 'row', marginTop: 2, paddingRight: 4 }}>
              <Text style={{ width: 18, fontSize: 14, lineHeight: 20, color: colors.primary, fontWeight: '800' }}>{numbered ? `${numbered[1]}.` : '•'}</Text>
              <Text style={{ flex: 1, fontSize: 14, lineHeight: 20, color }}><Inline text={(bullet ? bullet[1] : numbered![2])} color={color} /></Text>
            </View>
          );
        }
        return <Text key={i} style={{ fontSize: 14, lineHeight: 20, color }}><Inline text={line} color={color} /></Text>;
      })}
    </View>
  );
}

function Bubble({ m, onLink, onProduct, onRetry, busy, onAddCart, renderWidget }: { m: Msg; onLink: (l: AssistantLink) => void; onProduct: (p: AssistantProduct) => void; onRetry: (t: string) => void; busy: boolean; onAddCart?: (p: AssistantProduct) => void; renderWidget?: (kind: Widget['kind']) => React.ReactNode }) {
  const mine = m.sender === 'user';
  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', maxWidth: '92%' }}>
        {!mine && (
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 6, marginBottom: 14 }}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
          </View>
        )}
        <View style={{ flexShrink: 1 }}>
          {mine ? (
            <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 18, borderBottomRightRadius: 5, paddingHorizontal: 13, paddingVertical: 9 }}>
              <Text style={{ fontSize: 14, lineHeight: 20, color: '#fff' }}>{m.text}</Text>
            </LinearGradient>
          ) : (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 18, borderBottomLeftRadius: 5, paddingHorizontal: 13, paddingVertical: 9 }}>
              <RichText text={m.text} color={colors.ink} />
            </View>
          )}

          {!mine && !!m.products?.length && (
            <View style={{ marginTop: 8, gap: 6 }}>
              {m.products.map((p) => (
                <Pressable key={p.id} onPress={() => onProduct(p)} className="flex-row items-center gap-2.5 bg-white border border-orange-100 rounded-2xl p-2 active:opacity-80">
                  {p.image ? (
                    <Image source={{ uri: p.image }} style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primarySoft }} />
                  ) : (
                    <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="bag-handle-outline" size={18} color={colors.primary} /></View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: colors.ink }}>{p.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primaryDark }}>₹{Number(p.price).toLocaleString('en-IN')}</Text>
                      {!!p.originalPrice && <Text style={{ fontSize: 11, color: '#94A3B8', textDecorationLine: 'line-through' }}>₹{Number(p.originalPrice).toLocaleString('en-IN')}</Text>}
                      {!!p.discount && p.discount > 0 && <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>{p.discount}% off</Text>}
                    </View>
                  </View>
                  {onAddCart ? (
                    <Pressable onPress={() => onAddCart(p)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Add ${p.name} to cart`} className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-full bg-primary active:opacity-80">
                      <Ionicons name="cart-outline" size={13} color="#fff" /><Text style={{ fontSize: 11, fontWeight: '800', color: '#fff' }}>Add</Text>
                    </Pressable>
                  ) : <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />}
                </Pressable>
              ))}
            </View>
          )}

          {!mine && !!m.widget && renderWidget?.(m.widget)}

          {!mine && !!m.links?.length && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {m.links.map((l) => (
                <Pressable key={`${l.path}-${l.label}`} onPress={() => onLink(l)} className="px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 active:bg-orange-100">
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primaryDark }}>{l.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {!mine && !!m.retry && (
            <Pressable disabled={busy} onPress={() => onRetry(m.retry!)} className={cn('self-start flex-row items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full bg-white border border-orange-200 active:opacity-80', busy && 'opacity-50')}>
              <Ionicons name="refresh" size={12} color={colors.primaryDark} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primaryDark }}>Try again</Text>
            </Pressable>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3, paddingHorizontal: 4, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
            <Text style={{ fontSize: 10, color: '#94A3B8' }}>{m.time}</Text>
            {!mine && !m.local && (
              <Pressable onPress={() => { Share.share({ message: m.text }).catch(() => {}); }} hitSlop={8} accessibilityRole="button" accessibilityLabel="Share or copy this answer" style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Ionicons name="share-outline" size={12} color="#94A3B8" />
                <Text style={{ fontSize: 10, color: '#94A3B8' }}>Share</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

function TypingDots() {
  const [n, setN] = useState(0);
  React.useEffect(() => { const t = setInterval(() => setN((v) => (v + 1) % 3), 350); return () => clearInterval(t); }, []);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}><Ionicons name="sparkles" size={14} color={colors.primary} /></View>
      <View style={{ flexDirection: 'row', gap: 5, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 18, borderBottomLeftRadius: 5, paddingHorizontal: 14, paddingVertical: 14 }}>
        {[0, 1, 2].map((i) => <View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, opacity: n === i ? 1 : 0.3 }} />)}
      </View>
    </View>
  );
}

/* ------------------------------------- screen ------------------------------------- */
export default function AssistantScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const role: AppRole = user?.role ?? 'user';
  const key = `${user?.id ?? ''}:${role}`;

  const [messages, setMessages] = useState<Msg[]>(() => (saved && saved.key === key ? saved.messages : [greeting(role)]));
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<FlatList<Msg>>(null);
  const scrollMode = useRef<'start' | 'end'>('end');
  const [kb, setKb] = useState(false);
  const [showDown, setShowDown] = useState(false);
  const [bookingKey, setBookingKey] = useState<number | null>(null);
  const petsCtx = usePets();
  const cartCtx = useCart();

  // Android does not resize the window for the keyboard, so track it and lift the composer ourselves
  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKb(true));
    const b = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(false));
    return () => { a.remove(); b.remove(); };
  }, []);

  const commit = useCallback((next: Msg[] | ((p: Msg[]) => Msg[])) => {
    setMessages((prev) => {
      const val = typeof next === 'function' ? next(prev) : next;
      saved = { key, messages: val };
      return val;
    });
  }, [key]);

  const reset = () => { if (typing) return; setInput(''); setBookingKey(null); commit([greeting(role)]); };

  // messages the guided flows and action cards add (shown in the chat, never sent to the AI)
  const addBot: AddBot = useCallback((text, extra) => commit((p) => [...p, { id: uid(), sender: 'bot', local: true, time: now(), text, ...extra }]), [commit]);
  const addUser = useCallback((text: string) => commit((p) => [...p, { id: uid(), sender: 'user', local: true, time: now(), text }]), [commit]);

  const send = async (text: string = input, intent?: string) => {
    const message = text.trim();
    if (!message || typing) return;

    // conversation so far (not the greeting / guided steps / errors); the server accepts at most 20 items
    const history = messages
      .filter((m) => !m.local)
      .slice(-12)
      .map((m) => ({ role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model', text: m.text }));
    while (history.length && history[0].role !== 'user') history.shift();

    setBookingKey(null); // typing a new request leaves any booking in progress
    commit((p) => [...p, { id: uid(), sender: 'user', text: message, time: now() }]);
    setInput('');

    // things finished inside the chat itself, no AI round trip needed
    const act = detectAction(role, message, intent);
    if (act.local === 'book') {
      addBot("Sure, let's book an appointment. First, tell me which pet it's for.");
      setBookingKey(Date.now());
      return;
    }
    if (act.local === 'cancel' || act.local === 'resched') {
      addBot(act.local === 'cancel' ? 'Here are your upcoming appointments. Tap one to cancel it.' : 'Here are your upcoming appointments. Tap one to pick a new day and time.', { widget: act.local });
      return;
    }

    setTyping(true);
    try {
      const res = await assistantService.send(message, history, intent);
      if (res.action?.type === 'start_booking') {
        // the server recognised a booking request the local check missed
        addBot("Sure, let's book an appointment. First, tell me which pet it's for.");
        setBookingKey(Date.now());
      } else {
        scrollMode.current = 'start'; // read a new answer from its first line, like the web chat
        commit((p) => [...p, { id: uid(), sender: 'bot', text: res.reply, time: now(), links: res.links, products: res.products, widget: act.widget }]);
      }
    } catch (e: any) {
      commit((p) => [...p, { id: uid(), sender: 'bot', local: true, time: now(), text: e?.message || 'Sorry, something went wrong. Please try again.', retry: message }]);
    } finally {
      setTyping(false);
    }
  };

  const onLink = (l: AssistantLink) => { openAssistantPath(navigation, role, l.path); };
  const onProduct = (p: AssistantProduct) => { if (role === 'user') navigation.navigate('ProductDetail', { id: p.id }); };
  const onAddCart = role === 'user' && cartCtx?.addToCart
    ? async (p: AssistantProduct) => { if (await cartCtx.addToCart(p.id, 1)) { toast.success(`${p.name} added to cart`); addBot(`Added **${p.name}** to your cart.`, { links: [{ label: 'View cart', path: '/owner/store/cart' }, { label: 'Checkout', path: '/owner/store/checkout' }] }); } }
    : undefined;
  const renderWidget = (kind: Widget['kind']) => {
    if (kind === 'cancel' || kind === 'resched') return <OwnerAppointmentCards kind={kind} cancelAppointment={petsCtx?.cancelAppointment} rescheduleAppointment={petsCtx?.rescheduleAppointment} />;
    if (kind === 'dr_pending' || kind === 'dr_today') return <DoctorAppointmentCards kind={kind} />;
    if (kind === 'sm_orders') return <StoreOrderCards />;
    return <StoreStockCards />;
  };

  const data = messages.filter((m) => m.id !== 'greeting');
  const onListScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    setShowDown(contentSize.height - contentOffset.y - layoutMeasurement.height > 160);
  };
  const onContentSize = () => {
    if (scrollMode.current === 'start' && data.length) {
      scrollMode.current = 'end';
      listRef.current?.scrollToIndex({ index: data.length - 1, viewPosition: 0, animated: true });
    } else {
      listRef.current?.scrollToEnd({ animated: true });
    }
  };

  const first = user?.name?.split(' ')[0];
  const fresh = messages.length === 1;
  const canSend = !!input.trim() && !typing;

  return (
    <KeyboardAvoidingView className="flex-1 bg-cream" behavior="padding">
      {/* header */}
      <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Close chat" hitSlop={8} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <View>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' }}>
              <Image source={require('../../assets/logo1.png')} style={{ width: 24, height: 24, tintColor: '#fff' }} resizeMode="contain" />
            </View>
            <View style={{ position: 'absolute', right: -2, bottom: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4ADE80', borderWidth: 2, borderColor: colors.primary }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }} numberOfLines={1}>WonPet AI</Text>
            <Text style={{ color: '#FFF1E3', fontSize: 12 }} numberOfLines={1}>{ROLE_LABEL[role]} • Online</Text>
          </View>
          <Pressable onPress={reset} disabled={typing} accessibilityRole="button" accessibilityLabel="New chat" hitSlop={8} style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', opacity: typing ? 0.4 : 1 }}>
            <Ionicons name="refresh" size={17} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      {/* conversation */}
      {fresh ? (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 18, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginTop: 10 }}>
            <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#FFEDD5', alignItems: 'center', justifyContent: 'center' }}>
              <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 66, height: 66, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
                <Image source={require('../../assets/logo1.png')} style={{ width: 38, height: 38, tintColor: '#fff' }} resizeMode="contain" />
              </LinearGradient>
            </View>
            <Text style={{ marginTop: 12, fontSize: 21, fontWeight: '800', color: colors.ink }}>Hi{first ? `, ${first}` : ''} 👋</Text>
            <Text style={{ marginTop: 4, fontSize: 14, color: '#64748B', textAlign: 'center', maxWidth: 280 }}>{WELCOME[role]}</Text>
          </View>

          <View style={{ marginTop: 22, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.borderSoft, borderRadius: 18, borderBottomLeftRadius: 5, paddingHorizontal: 13, paddingVertical: 10 }}>
            <RichText text={GREETING[role]} color={colors.ink} />
          </View>

          <Text style={{ marginTop: 22, marginBottom: 10, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: '#94A3B8' }}>QUICK ACTIONS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {QUICK[role].map((q) => (
              <Pressable key={q.title} onPress={() => send(q.prompt, q.intent)} accessibilityRole="button" style={{ width: '48%' }} className="flex-row items-center gap-2.5 bg-white border border-orange-100 rounded-2xl p-3 active:bg-orange-50">
                <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={q.icon} size={17} color={colors.primary} /></View>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: colors.ink }} numberOfLines={2}>{q.title}</Text>
              </Pressable>
            ))}
          </View>
          {typing && <View style={{ marginTop: 18 }}><TypingDots /></View>}
        </ScrollView>
      ) : (
        <FlatList
          ref={listRef}
          className="flex-1"
          data={data}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 8 }}
          keyboardShouldPersistTaps="handled"
          onScroll={onListScroll}
          scrollEventThrottle={64}
          onScrollToIndexFailed={() => listRef.current?.scrollToEnd({ animated: true })}
          onContentSizeChange={onContentSize}
          renderItem={({ item }) => <Bubble m={item} onLink={onLink} onProduct={onProduct} onRetry={(t) => send(t)} busy={typing} onAddCart={onAddCart} renderWidget={renderWidget} />}
          ListFooterComponent={bookingKey ? (
            <BookingFlow key={bookingKey} pets={petsCtx?.pets ?? []} user={user} addBot={addBot} addUser={addUser} onEnd={() => setBookingKey(null)}
              onBooked={(a) => { petsCtx?.upsertAppointment?.(a); petsCtx?.refreshAppointments?.(); }} />
          ) : typing ? <TypingDots /> : undefined}
        />
      )}

      {!fresh && showDown && (
        <Pressable onPress={() => listRef.current?.scrollToEnd({ animated: true })} accessibilityRole="button" accessibilityLabel="Scroll to latest message" style={{ position: 'absolute', alignSelf: 'center', bottom: 150, width: 38, height: 38, borderRadius: 19, backgroundColor: '#fff', borderWidth: 1, borderColor: '#FED7AA', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 }}>
          <Ionicons name="arrow-down" size={17} color={colors.primary} />
        </Pressable>
      )}

      {/* composer */}
      <View style={{ backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: colors.borderSoft, paddingHorizontal: 12, paddingTop: 10, paddingBottom: kb ? 10 : Math.max(insets.bottom, 10) }}>
        {!fresh && !typing && !bookingKey && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ marginBottom: 8 }} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
            {SUGGESTED[role].map((s) => (
              <Pressable key={s} onPress={() => send(s)} className="px-3 py-1.5 rounded-full bg-orange-50 border border-orange-200 active:bg-orange-100">
                <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primaryDark }}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', borderRadius: 24, paddingLeft: 14, paddingRight: 6, paddingVertical: 6 }}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={PLACEHOLDER[role]}
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={2000}
            style={{ flex: 1, maxHeight: 110, minHeight: 36, fontSize: 14, color: colors.ink, paddingTop: Platform.OS === 'ios' ? 8 : 6, paddingBottom: Platform.OS === 'ios' ? 8 : 6 }}
          />
          <Pressable onPress={() => send()} disabled={!canSend} accessibilityRole="button" accessibilityLabel="Send message" style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: canSend ? colors.primary : '#E2E8F0' }}>
            {typing ? <ActivityIndicator size="small" color="#94A3B8" /> : <Ionicons name="send" size={16} color={canSend ? '#fff' : '#94A3B8'} />}
          </Pressable>
        </View>
        <Text style={{ marginTop: 6, textAlign: 'center', fontSize: 10, color: '#94A3B8' }}>{DISCLAIMER[role]}</Text>
      </View>
    </KeyboardAvoidingView>
  );
}