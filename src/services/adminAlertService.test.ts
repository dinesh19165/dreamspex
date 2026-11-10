import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminAlertService, getNewAdminAlerts, type AdminAlert } from './adminAlertService';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('admin alert API', () => {
  it('loads independent order, refund, and replacement events', async () => {
    const events = [
      { id: 'order-1', type: 'ORDER', sourceId: 'order-1', acknowledgedAt: null, resolvedAt: null },
      { id: 'return-1', type: 'REFUND', sourceId: 'return-1', acknowledgedAt: null, resolvedAt: null },
      { id: 'return-2', type: 'REPLACEMENT', sourceId: 'return-2', acknowledgedAt: null, resolvedAt: null },
    ];
    const fetchMock = vi.fn().mockResolvedValue(Response.json(events));
    vi.stubGlobal('fetch', fetchMock);

    await expect(adminAlertService.list('admin-token')).resolves.toEqual(events);
    expect(new Set(events.map((event) => event.id)).size).toBe(3);
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/api/v1/admin/alerts');
  });

  it('surfaces first-poll pending alerts and only newly arrived events on later polls', () => {
    const makeAlert = (id: string, acknowledgedAt: string | null = null): AdminAlert => ({
      id,
      type: 'ORDER',
      title: 'New customer order',
      sourceId: id,
      customerName: 'Customer',
      orderId: id,
      orderNumber: `DS-${id}`,
      eventAt: '2026-11-10T00:00:00Z',
      acknowledgedAt,
      resolvedAt: null,
    });
    const firstPoll = [makeAlert('already-pending'), makeAlert('already-acknowledged', '2026-11-10T00:01:00Z')];
    expect(getNewAdminAlerts(firstPoll, null)).toEqual([firstPoll[0]]);

    const secondPoll = [...firstPoll, makeAlert('new-order')];
    expect(getNewAdminAlerts(secondPoll, new Set(firstPoll.map((alert) => alert.id))))
      .toEqual([secondPoll[2]]);
  });

  it('persists single and bulk acknowledgement through the backend', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ id: 'alert-1', acknowledgedAt: '2026-11-10T00:00:00Z' }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(adminAlertService.acknowledge('admin-token', 'alert-1'))
      .resolves.toMatchObject({ acknowledgedAt: '2026-11-10T00:00:00Z' });
    await expect(adminAlertService.acknowledgeAll('admin-token')).resolves.toBeUndefined();
    expect(fetchMock.mock.calls.map((call) => (call[0] as string).split('/api/v1')[1])).toEqual([
      '/admin/alerts/alert-1/acknowledge',
      '/admin/alerts/acknowledge-all',
    ]);
  });
});
