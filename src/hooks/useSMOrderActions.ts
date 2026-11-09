import { useState } from 'react';
import { WonPetsAlert, toast } from '../components/WonPetsAlert';
import { errorMessage } from '../services/api';
import { OrderAction, SMOrder, courierHandles, smService } from '../services/storeManager.service';
import { useStoreManager } from '../context/StoreManagerContext';

const CONFIRM: Record<OrderAction, { title: string; text: string; confirm: string }> = {
  accept: { title: 'Accept this order?', text: 'The customer is told their order is being prepared.', confirm: 'Accept' },
  ship: { title: 'Mark as shipped?', text: 'Do this once the parcel has left your store.', confirm: 'Mark shipped' },
  deliver: { title: 'Mark as delivered?', text: 'Only do this once the customer has received the order.', confirm: 'Delivered' },
  cancel: { title: 'Cancel this order?', text: 'The customer will be notified. This cannot be undone.', confirm: 'Cancel order' },
};

/** The buttons an order shows for its status - same rules as the web OrdersTable. */
export function actionsFor(o: SMOrder): { action: OrderAction; label: string; icon: string; tone: 'green' | 'red' | 'cyan' }[] {
  if (o.status === 'Pending') return [
    { action: 'accept', label: 'Accept', icon: 'checkmark', tone: 'green' },
    { action: 'cancel', label: 'Reject', icon: 'close', tone: 'red' },
  ];
  if (o.status === 'Processing') return [{ action: 'ship', label: o.shipping?.mode === 'shiprocket' ? 'Request pickup' : 'Mark shipped', icon: 'car', tone: 'cyan' }];
  if (o.status === 'Shipped' && !courierHandles(o)) return [{ action: 'deliver', label: 'Mark delivered', icon: 'cube', tone: 'green' }];
  return [];
}

/** Runs an order status change with a confirm step, toasts the result and calls `done` to reload. */
export function useSMOrderActions(done: () => void) {
  const { syncNow } = useStoreManager();
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (o: SMOrder, action: OrderAction) => {
    const c = { ...CONFIRM[action] };
    if (action === 'ship' && o.shipping?.mode === 'shiprocket') {
      c.title = 'Request courier pickup?';
      c.text = 'Pack the order and stick the label on first. The courier will be asked to collect it.';
      c.confirm = 'Request pickup';
    }
    const r = action === 'cancel'
      ? await WonPetsAlert.delete(c.title, c.text, { confirmText: c.confirm, cancelText: 'Keep order' })
      : await WonPetsAlert.confirm(c.title, c.text, { confirmText: c.confirm });
    if (!r.isConfirmed) return;
    setBusy(`${o.id}:${action}`);
    try {
      const res = await smService.orderAction(o.id, action);
      toast.success(res.message || 'Order updated');
      // e.g. accepted but the courier shipment needs attention
      if (res.warning) WonPetsAlert.warning('Heads up', res.warning);
      done();
      syncNow();
    } catch (e) {
      toast.error(errorMessage(e, 'Failed to update order.'));
    } finally {
      setBusy(null);
    }
  };

  return { run, busy, isBusy: (o: SMOrder, a?: OrderAction) => (a ? busy === `${o.id}:${a}` : !!busy?.startsWith(`${o.id}:`)) };
}
