import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import type { Appointment } from '../data/mock';
import type { CardAction } from '../components/appointments/AppointmentCard';
import { WonPetsAlert, toast } from '../components/WonPetsAlert';
import { errorMessage } from '../services/api';
import { callUrl, doctorService } from '../services/doctor.service';

/**
 * Every doctor-side appointment action in one place (Home, Schedule and the detail screen all use it):
 * Pending -> Accept / Decline, Confirmed -> Start, In Progress -> Join (online) / Complete.
 * `onChanged` runs after a successful change so the calling screen can reload.
 */
export function useDoctorActions(onChanged: () => void) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const guard = useCallback(async (id: string, fn: () => Promise<void>, ok: string) => {
    if (busyId) return false;
    setBusyId(id);
    try { await fn(); toast.success(ok); onChanged(); return true; }
    catch (e) { toast.error(errorMessage(e)); return false; }
    finally { setBusyId(null); }
  }, [busyId, onChanged]);

  const join = useCallback(async (a: Appointment) => {
    try { await Linking.openURL(callUrl(a)); } catch { toast.error('Could not open the video call.'); }
  }, []);

  const accept = useCallback((a: Appointment) => guard(a.id, () => doctorService.accept(a.id), `${a.pet}'s visit confirmed`), [guard]);

  const decline = useCallback(async (a: Appointment) => {
    const r = await WonPetsAlert.delete('Decline this request?', `${a.owner ?? 'The pet owner'} will be told that ${a.pet}'s appointment was cancelled.`, { confirmText: 'Yes, decline' });
    if (!r.isConfirmed) return false;
    return guard(a.id, () => doctorService.decline(a.id), 'Request declined');
  }, [guard]);

  const start = useCallback(async (a: Appointment) => {
    const ok = await guard(a.id, () => doctorService.start(a.id), 'Consultation started');
    if (ok && a.mode === 'Online') join(a);
    return ok;
  }, [guard, join]);

  const complete = useCallback(async (a: Appointment) => {
    const r = await WonPetsAlert.confirm('Complete this visit?', `${a.pet}'s consultation will be marked as completed and the owner is notified.`, { confirmText: 'Complete visit' });
    if (!r.isConfirmed) return false;
    return guard(a.id, () => doctorService.complete(a.id), 'Visit completed');
  }, [guard]);

  /** The buttons that fit an appointment's status (for AppointmentCard `actions`). */
  const actionsFor = useCallback((a: Appointment, extra?: { reschedule?: (a: Appointment) => void }): CardAction[] => {
    const out: CardAction[] = [];
    switch (a.status) {
      case 'Pending':
        out.push({ label: 'Accept', icon: 'checkmark', onPress: () => accept(a), solid: true }, { label: 'Decline', icon: 'close', onPress: () => decline(a), danger: true });
        break;
      case 'Confirmed':
        out.push({ label: a.mode === 'Online' ? 'Start & join' : 'Start visit', icon: a.mode === 'Online' ? 'videocam' : 'play', onPress: () => start(a), solid: true });
        if (extra?.reschedule) out.push({ label: 'Reschedule', icon: 'calendar-outline', onPress: () => extra.reschedule!(a) });
        break;
      case 'In Progress':
        if (a.mode === 'Online') out.push({ label: 'Join call', icon: 'videocam', onPress: () => join(a), solid: true });
        out.push({ label: 'Complete', icon: 'checkmark-done', onPress: () => complete(a), solid: a.mode !== 'Online' });
        break;
    }
    return out;
  }, [accept, decline, start, join, complete]);

  return { busyId, accept, decline, start, complete, join, actionsFor };
}
