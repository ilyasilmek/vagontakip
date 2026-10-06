import { test, expect, type APIRequestContext } from '@playwright/test';
import type { CollectionName, OperationalRecord, RecordResponse, SafeUser, Wagon } from '../shared/types';
import { apiContext, baseURL, createUser, credentials, data, deleteCreatedRecords, deleteCreatedUser, login, uniqueName, uniquePassword, waitUntilReady } from './helpers';

test('shared records, administrator permissions, conflict handling and session revocation', async ({ playwright }) => {
  const admin = await apiContext(playwright);
  const firstPhone = await apiContext(playwright);
  const secondPhone = await apiContext(playwright);
  const anonymous = await apiContext(playwright);
  const contexts: APIRequestContext[] = [admin, firstPhone, secondPhone, anonymous];
  const created: { collection: CollectionName; id: string }[] = [];
  let temporaryUserId: string | undefined;
  try {
    await waitUntilReady(admin);
    expect((await anonymous.get('/api/data')).status()).toBe(401);
    expect(((await (await anonymous.get('/api/session')).json()) as { user: unknown }).user).toBeNull();

    const administrator = await login(admin, await credentials());
    expect(administrator.role).toBe('admin');
    const sessionCookie = (await admin.storageState()).cookies.find(cookie => cookie.name === 'vagontakip_session');
    expect(sessionCookie?.httpOnly).toBe(true);
    expect(sessionCookie?.sameSite).toBe('Strict');
    const temporary = await createUser(admin, 'shared');
    temporaryUserId = temporary.user.id;
    await login(firstPhone, temporary.account);
    await login(secondPhone, temporary.account);

    const wagonFields = { number: uniqueName('wagon'), entryDate: '2026-10-06', channelDate: '', completedDate: '', status: 'Bekliyor', notes: 'First phone created this record.' };
    const create = await firstPhone.post('/api/wagons', { data: wagonFields });
    expect(create.status()).toBe(201);
    const wagon = ((await create.json()) as RecordResponse).record as Wagon;
    created.push({ collection: 'wagons', id: wagon.id });
    expect((await data(secondPhone)).wagons.find(record => record.id === wagon.id)?.notes).toBe(wagonFields.notes);

    const changedNotes = 'Second phone changed this record.';
    const update = await secondPhone.patch(`/api/wagons/${wagon.id}`, { data: { revision: wagon.revision, notes: changedNotes } });
    expect(update.status()).toBe(200);
    const edited = ((await update.json()) as RecordResponse).record as Wagon;
    expect(edited.revision).toBe(wagon.revision + 1);
    expect((await data(firstPhone)).wagons.find(record => record.id === wagon.id)?.notes).toBe(changedNotes);
    expect((await data(admin)).wagons.find(record => record.id === wagon.id)?.notes).toBe(changedNotes);

    const conflict = await firstPhone.patch(`/api/wagons/${wagon.id}`, { data: { revision: wagon.revision, notes: 'An outdated edit must never overwrite.' } });
    expect(conflict.status()).toBe(409);
    expect((await conflict.json() as { code: string }).code).toBe('REVISION_CONFLICT');
    expect((await data(admin)).wagons.find(record => record.id === wagon.id)?.notes).toBe(changedNotes);
    expect((await firstPhone.delete(`/api/wagons/${wagon.id}`, { data: { revision: edited.revision } })).status()).toBe(403);
    expect((await firstPhone.get('/api/admin/users')).status()).toBe(403);
    expect((await secondPhone.get('/api/admin/audit')).status()).toBe(403);
    expect((await firstPhone.post('/api/admin/users', { data: {} })).status()).toBe(403);

    // Both missing Origin and a foreign Origin are rejected before mutation.
    expect((await anonymous.post('/api/login', { headers: { Origin: 'https://untrusted.example' }, data: {} })).status()).toBe(403);
    const missingOrigin = await playwright.request.newContext({ baseURL });
    contexts.push(missingOrigin);
    expect((await missingOrigin.post('/api/login', { data: {} })).status()).toBe(403);
    expect((await firstPhone.post('/api/wagons', { headers: { Origin: 'https://untrusted.example' }, data: wagonFields })).status()).toBe(403);

    const fields: Record<CollectionName, Record<string, string | number>> = {
      wagons: wagonFields,
      parts: { type: uniqueName('part'), brand: 'E2E', quantity: 2, serialNumber: '', wagonNumber: wagon.number, removedDate: '2026-10-06', sentDate: '', returnedDate: '', faultNotes: '' },
      inventory: { type: uniqueName('inventory'), brand: 'E2E', quantity: 1, serialNumber: '' },
    };
    for (const collection of ['wagons', 'parts', 'inventory'] as CollectionName[]) {
      let current: OperationalRecord;
      if (collection === 'wagons') current = edited;
      else {
        const response = await firstPhone.post(`/api/${collection}`, { data: fields[collection] });
        expect(response.status()).toBe(201);
        current = ((await response.json()) as RecordResponse).record;
        created.push({ collection, id: current.id });
      }
      const payload = collection === 'wagons' ? { notes: 'Administrator reviewed this.' } : { quantity: 3 };
      const response = await admin.patch(`/api/${collection}/${current.id}`, { data: { revision: current.revision, ...payload } });
      expect(response.status(), `Administrator can edit ${collection}`).toBe(200);
      const updated = ((await response.json()) as RecordResponse).record;
      expect(updated.updatedBy).toBe(administrator.id);
      expect((await admin.delete(`/api/${collection}/${updated.id}`, { data: { revision: updated.revision } })).status(), `Administrator can delete ${collection}`).toBe(200);
      expect((await data(secondPhone))[collection].some(record => record.id === updated.id)).toBe(false);
    }

    const response = await admin.get('/api/data');
    expect(response.headers()['cache-control']).toBe('no-store');
    expect(response.headers()['vary']).toContain('Cookie');
    const snapshot = await response.json() as Record<string, unknown>;
    expect(Object.keys(snapshot)).not.toContain('users');
    expect(Object.keys(snapshot)).not.toContain('audit');
    expect(Object.keys(snapshot.user as object)).not.toContain('password');

    const newPassword = uniquePassword();
    const reset = await admin.patch(`/api/admin/users/${temporaryUserId}`, { data: { password: newPassword } });
    expect(reset.status()).toBe(200);
    expect((await firstPhone.get('/api/data')).status()).toBe(401);
    expect((await secondPhone.get('/api/data')).status()).toBe(401);
    await login(firstPhone, { username: temporary.account.username, password: newPassword });
    const copiedSession = await playwright.request.newContext({ baseURL, storageState: await firstPhone.storageState(), extraHTTPHeaders: { Origin: new URL(baseURL).origin } });
    contexts.push(copiedSession);
    expect((await copiedSession.get('/api/data')).status()).toBe(200);
    expect((await firstPhone.post('/api/logout', { data: {} })).status()).toBe(200);
    expect((await copiedSession.get('/api/data')).status()).toBe(401);
    expect((await firstPhone.get('/api/data')).status()).toBe(401);

    await login(secondPhone, { username: temporary.account.username, password: newPassword });
    expect((await admin.patch(`/api/admin/users/${temporaryUserId}`, { data: { active: false } })).status()).toBe(200);
    expect((await secondPhone.get('/api/data')).status()).toBe(401);
    expect((await secondPhone.get('/api/session')).status()).toBe(200);
    expect((await (await secondPhone.get('/api/session')).json() as { user: SafeUser | null }).user).toBeNull();
  } finally {
    try { await deleteCreatedRecords(admin, created); }
    finally {
      try { await deleteCreatedUser(admin, temporaryUserId); }
      finally { await Promise.all(contexts.map(context => context.dispose())); }
    }
  }
});
