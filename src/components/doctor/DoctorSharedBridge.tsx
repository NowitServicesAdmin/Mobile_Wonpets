import React, { useEffect } from 'react';
import { useDoctor } from '../../context/DoctorContext';
import { useSettings } from '../../context/SettingsContext';
import { useManaged } from '../../context/ManagedContext';
import { LiveSyncTickProvider } from '../../context/LiveSyncContext';

/**
 * Doctors have no full LiveSyncProvider (no pets / cart / resell), but "Shared With Me" needs live data too.
 * Whenever the doctor's own live tick moves, re-read the invitations + shared accounts, and hand the same tick
 * to the shared screens (SharedHome / SharedPets) so they reload exactly like they do for owners.
 */
export default function DoctorSharedBridge({ children }: { children: React.ReactNode }) {
  const { tick, unread, syncNow } = useDoctor();
  const { refreshInvitations } = useSettings();
  const { refreshAccounts } = useManaged();

  useEffect(() => {
    if (!tick) return;
    Promise.resolve(refreshInvitations?.()).catch(() => {});
    refreshAccounts().catch(() => {});
  }, [tick, refreshInvitations, refreshAccounts]);

  return <LiveSyncTickProvider tick={tick} unread={unread} syncNow={syncNow}>{children}</LiveSyncTickProvider>;
}
