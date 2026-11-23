import { WonPetsAlert } from '../components/WonPetsAlert';

/** Error code the server sends when an email / number belongs to an account deleted less than 90 days ago. */
export const PENDING_DELETION = 'ACCOUNT_PENDING_DELETION';

export const askToRestore = (message?: string) =>
  WonPetsAlert.confirm(
    'Restore your account?',
    `${message || 'This account was deleted.'}\n\nDo you want to restore it and continue? We'll verify it's you before anything is restored.`,
    { confirmText: 'Yes, restore', cancelText: 'Not now' },
  );