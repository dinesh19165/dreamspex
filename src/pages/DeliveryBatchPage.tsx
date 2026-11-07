import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Clock3, MapPin, Navigation, PackageCheck, RefreshCw, Truck } from 'lucide-react';
import { useParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import { deliveryBatchService, type DriverDeliveryBatch, type DriverDeliveryOrder } from '../services/deliveryBatchService';
import { getReturnDeliveryActions, returnDeliveryRequiresOtp } from '../utils/returnDelivery';
import { googleMapsDirectionsUrl, googleMapsLocationUrl, isValidCoordinates } from '../utils/deliveryNavigation';

export default function DeliveryBatchPage() {
  const { token = '' } = useParams();
  const [batch, setBatch] = useState<DriverDeliveryBatch | null>(null);
  const [otpByOrder, setOtpByOrder] = useState<Record<string, string>>({});
  const [noteByOrder, setNoteByOrder] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyOrder, setBusyOrder] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setBatch(await deliveryBatchService.getDriverBatch(token));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to open this delivery batch.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const update = async (order: DriverDeliveryOrder, status: string) => {
    const otpRequired = batch ? returnDeliveryRequiresOtp(status, batch.operationType) : false;
    if (otpRequired && !otpByOrder[order.id]?.trim()) {
      setError(`Enter the OTP for ${order.requestNumber ?? order.orderNumber} before confirming.`);
      return;
    }
    setBusyOrder(order.id);
    setError('');
    setNotice('');
    try {
      await deliveryBatchService.updateOrderStatus(
        token,
        order.id,
        status,
        otpRequired ? otpByOrder[order.id]?.trim() : undefined,
        noteByOrder[order.id]?.trim(),
      );
      setOtpByOrder((current) => ({ ...current, [order.id]: '' }));
      setNotice(`${order.orderNumber} updated to ${status.replaceAll('_', ' ').toLowerCase()}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update delivery status.');
    } finally {
      setBusyOrder('');
    }
  };

  const stat = batch ? [
    ['Total', batch.total, PackageCheck],
    ['Pending', batch.pending, Clock3],
    [batch.operationType === 'RETURN_PICKUP' ? 'Completed' : 'Delivered', batch.completed, CheckCircle],
    ['Failed', batch.failed, AlertTriangle],
  ] as const : [];

  return <main className="min-h-screen bg-[var(--bg-primary)] px-4 py-8 text-[var(--text-primary)] sm:px-6">
    <div className="mx-auto max-w-4xl">
      <SectionTitle eyebrow="Dream Spex delivery"
        title={batch?.operationType === 'RETURN_PICKUP' ? 'Return pickup batch' : batch?.operationType === 'REPLACEMENT_DELIVERY' ? 'Replacement delivery batch' : 'Route delivery batch'}
        description={batch?.operationType === 'RETURN_PICKUP'
          ? 'Update each return pickup independently. Confirm collection only after verifying that request’s OTP.'
          : 'Update each delivery independently. Confirm completion only after verifying that request’s OTP.'} />
      {loading ? <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">Opening secure delivery batch…</p> : null}
      {error ? <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-200"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><p>{error}</p></div> : null}
      {notice ? <p role="status" className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{notice}</p> : null}
      {!loading && batch ? <>
        <section className="mt-6 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">Route</p><h2 className="mt-1 text-xl font-semibold">{batch.routeName}</h2></div><Button type="button" variant="ghost" className="px-3 py-2" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{stat.map(([label, count, Icon]) => <div key={label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3"><p className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"><Icon className="h-4 w-4" />{label}</p><p className="mt-2 text-2xl font-semibold">{count}</p></div>)}</div>
          {batch.linkExpiresAt ? <p className="mt-4 text-xs text-[var(--text-secondary)]">Link expires {new Date(batch.linkExpiresAt).toLocaleString('en-IN')}.</p> : null}
        </section>
        <div className="mt-5 grid gap-4">
          {batch.orders.map((order) => <DeliveryOrderCard
            key={order.id}
            order={order}
            operationType={batch.operationType}
            otp={otpByOrder[order.id] ?? ''}
            note={noteByOrder[order.id] ?? ''}
            busy={busyOrder === order.id}
            onOtpChange={(value) => setOtpByOrder((current) => ({ ...current, [order.id]: value.replace(/\D/g, '').slice(0, 6) }))}
            onNoteChange={(value) => setNoteByOrder((current) => ({ ...current, [order.id]: value }))}
            onUpdate={(status) => void update(order, status)}
          />)}
        </div>
      </> : null}
    </div>
  </main>;
}

function DeliveryOrderCard({
  order, operationType, otp, note, busy, onOtpChange, onNoteChange, onUpdate,
}: {
  order: DriverDeliveryOrder;
  operationType: DriverDeliveryBatch['operationType'];
  otp: string;
  note: string;
  busy: boolean;
  onOtpChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onUpdate: (status: string) => void;
}) {
  const actions = getReturnDeliveryActions(order.status, operationType);
  const pickup = operationType === 'RETURN_PICKUP';
  const coordinates = order.latitude !== null && order.longitude !== null
    && isValidCoordinates(order.latitude, order.longitude)
    ? { latitude: order.latitude, longitude: order.longitude }
    : null;
  return <article className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs text-[var(--text-secondary)]">{pickup ? `Return request ${order.requestNumber ?? ''}` : operationType === 'REPLACEMENT_DELIVERY' ? `Replacement request ${order.requestNumber ?? ''}` : 'Order'}</p><h3 className="mt-1 text-lg font-semibold">{order.orderNumber}</h3></div>
      <span className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs font-medium">{order.status.replaceAll('_', ' ')}</span>
    </div>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <div className="rounded-xl bg-[var(--bg-primary)] p-3">
        <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Customer delivery details</p>
        <p className="mt-2 font-semibold">{order.recipientName}</p>
        <a className="mt-1 inline-block text-sm underline" href={`tel:${order.phone}`}>{order.phone}</a>
        <p className="mt-2 flex items-start gap-2 text-sm"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{order.address}, {order.city}, {order.state} {order.postalCode}, {order.countryCode}</p>
        {coordinates ? <>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">Coordinates: {coordinates.latitude}, {coordinates.longitude}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={googleMapsLocationUrl(coordinates)}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center rounded-full border border-[var(--border-subtle)] px-3 py-2 text-xs font-medium">
              <MapPin className="mr-2 h-4 w-4" />View on Map
            </a>
            <a href={googleMapsDirectionsUrl(coordinates)}
              target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center rounded-full bg-[#7CBF00] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]">
              <Navigation className="mr-2 h-4 w-4" />Get Directions
            </a>
          </div>
        </> : <p className="mt-2 text-xs text-amber-300">Location not available. Use the address above for this delivery.</p>}
      </div>
      <div className="rounded-xl bg-[var(--bg-primary)] p-3">
        <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Items</p>
        <ul className="mt-2 space-y-1 text-sm">{order.items.map((item, index) => <li key={`${item.productName}-${index}`}>{item.productName} × {item.quantity}</li>)}</ul>
      </div>
    </div>
    {actions.length ? <div className="mt-4 grid gap-3">
      {actions.some((action) => action.status === (pickup ? 'PICKED_UP' : 'DELIVERED')) ? <label className="text-xs text-[var(--text-secondary)]">{pickup ? 'Customer’s 6-digit return pickup OTP' : 'Customer’s 6-digit delivery OTP'}
        <input value={otp} onChange={(event) => onOtpChange(event.target.value)} inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="mt-1 h-12 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 font-mono text-lg tracking-[0.35em] text-[var(--text-primary)]" placeholder="••••••" />
      </label> : null}
      {actions.some((action) => action.status === 'FAILED_ATTEMPT') ? <label className="text-xs text-[var(--text-secondary)]">Attempt note (optional)
        <input value={note} onChange={(event) => onNoteChange(event.target.value)} maxLength={500} className="mt-1 h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]" placeholder="Reason delivery could not be completed" />
      </label> : null}
      <div className="flex flex-wrap gap-2">{actions.map((action) => <Button key={action.status} type="button" disabled={busy} className="px-4 py-2" onClick={() => onUpdate(action.status)}>
        {action.status === 'DELIVERED' ? <CheckCircle className="mr-2 h-4 w-4" /> : <Truck className="mr-2 h-4 w-4" />}{busy ? 'Saving…' : action.label}
      </Button>)}</div>
    </div> : <p className="mt-4 flex items-center gap-2 text-sm text-emerald-300"><CheckCircle className="h-4 w-4" />{pickup ? 'Return pickup completed' : 'Delivery completed'}</p>}
    {order.history.length ? <details className="mt-4 border-t border-[var(--border-subtle)] pt-3">
      <summary className="cursor-pointer text-xs text-[var(--text-secondary)]">Status history ({order.history.length})</summary>
      <ol className="mt-3 space-y-2">{order.history.map((event, index) => <li key={`${event.status}-${event.createdAt}-${index}`} className="text-xs"><span className="font-medium">{event.status.replaceAll('_', ' ')}</span><span className="text-[var(--text-secondary)]"> · {new Date(event.createdAt).toLocaleString('en-IN')}{event.note ? ` · ${event.note}` : ''}</span></li>)}</ol>
    </details> : null}
  </article>;
}
