import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useManaged } from '../../context/ManagedContext';
import ProfileSwitcher from '../ProfileSwitcher';

export function useAccountSwitch(onProfile: () => void, profileLabel: string) {
  const { user } = useAuth();
  const { canSwitch } = useManaged();
  const [open, setOpen] = useState(false);
  const enabled = canSwitch && (user?.role === 'user' || user?.role === 'doctor');
  return {
    avatarProps: {
      onAvatarPress: enabled ? () => setOpen(true) : onProfile,
      avatarLabel: enabled ? 'Switch account' : profileLabel,
      avatarBadge: enabled ? ('swap-horizontal' as const) : undefined,
    },
    sheet: <ProfileSwitcher visible={open} onClose={() => setOpen(false)} />,
  };
}