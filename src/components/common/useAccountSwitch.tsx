import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useManaged } from '../../context/ManagedContext';
import ProfileSwitcher from '../ProfileSwitcher';
import type { Anchor } from './Popover';

/** Avatar -> account switch. The switcher drops down right under the avatar that was tapped. */
export function useAccountSwitch(onProfile: () => void, profileLabel: string) {
  const { user } = useAuth();
  const { canSwitch } = useManaged();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const enabled = canSwitch && (user?.role === 'user' || user?.role === 'doctor');
  return {
    avatarProps: {
      onAvatarPress: enabled ? (a: Anchor) => { setAnchor(a); setOpen(true); } : () => onProfile(),
      avatarLabel: enabled ? 'Switch account' : profileLabel,
      avatarBadge: enabled ? ('swap-horizontal' as const) : undefined,
    },
    sheet: <ProfileSwitcher visible={open} anchor={anchor} onClose={() => setOpen(false)} />,
  };
}