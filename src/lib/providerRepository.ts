import type { ProviderData } from '../ProviderApp';
import { supabase } from './supabaseClient';

type Customer = ProviderData['customers'][number];
type Order = ProviderData['orders'][number];
type Payment = ProviderData['payments'][number];

const defaultPrices: ProviderData['prices'] = {
  miniLunch: 4000 / 30 / 2,
  miniDinner: 4000 / 30 / 2,
  fullLunch: 5000 / 30 / 2,
  fullDinner: 5000 / 30 / 2,
  miniMonthly: 4000,
  fullMonthly: 5000,
};

function client() {
  if (!supabase) throw new Error('Supabase is not configured. Add your VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
  return supabase;
}

function throwIfError(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function loadProviderData(userId: string): Promise<ProviderData> {
  const db = client();
  const [customersResult, ordersResult, paymentsResult, settingsResult] = await Promise.all([
    db.from('provider_customers').select('*').eq('user_id', userId),
    db.from('provider_orders').select('*').eq('user_id', userId),
    db.from('provider_payments').select('*').eq('user_id', userId),
    db.from('provider_settings').select('prices').eq('user_id', userId).maybeSingle(),
  ]);
  throwIfError(customersResult.error);
  throwIfError(ordersResult.error);
  throwIfError(paymentsResult.error);
  throwIfError(settingsResult.error);

  let prices = settingsResult.data?.prices as ProviderData['prices'] | undefined;
  if (!prices) {
    const { error } = await db.from('provider_settings').upsert({ user_id: userId, prices: defaultPrices }, { onConflict: 'user_id' });
    throwIfError(error);
    prices = defaultPrices;
  }

  const customers: Customer[] = (customersResult.data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    phone: row.phone || '',
    address: row.address || '',
    notes: row.notes || '',
    active: row.active,
    lunchPlan: row.lunch_plan,
    dinnerPlan: row.dinner_plan,
    createdAt: row.created_at,
  }));
  const orders: Order[] = (ordersResult.data || []).map((row: any) => ({
    id: row.id,
    customerId: row.customer_id,
    date: row.order_date,
    slot: row.slot,
    meal: row.meal,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    status: row.status,
    notes: row.notes || '',
    updatedAt: row.updated_at,
  }));
  const payments: Payment[] = (paymentsResult.data || []).map((row: any) => ({
    id: row.id,
    customerId: row.customer_id,
    date: row.payment_date,
    month: row.billing_month,
    amount: Number(row.amount),
    method: row.method,
    reference: row.reference || '',
    notes: row.notes || '',
  }));

  return { version: 1, prices: { ...defaultPrices, ...prices }, customers, orders, payments };
}

function customerRow(c: Customer, userId: string) {
  return { id: c.id, user_id: userId, name: c.name, phone: c.phone, address: c.address, notes: c.notes, active: c.active, lunch_plan: c.lunchPlan, dinner_plan: c.dinnerPlan, created_at: c.createdAt };
}
function orderRow(o: Order, userId: string) {
  return { id: o.id, user_id: userId, customer_id: o.customerId, order_date: o.date, slot: o.slot, meal: o.meal, quantity: o.quantity, unit_price: o.unitPrice, status: o.status, notes: o.notes, updated_at: o.updatedAt };
}
function paymentRow(p: Payment, userId: string) {
  return { id: p.id, user_id: userId, customer_id: p.customerId, payment_date: p.date, billing_month: p.month, amount: p.amount, method: p.method, reference: p.reference, notes: p.notes };
}
function changed<T extends { id: string }>(before: T[], after: T[]) {
  const old = new Map(before.map(item => [item.id, item]));
  return after.filter(item => JSON.stringify(old.get(item.id)) !== JSON.stringify(item));
}
function removed<T extends { id: string }>(before: T[], after: T[]) {
  const ids = new Set(after.map(item => item.id));
  return before.filter(item => !ids.has(item.id)).map(item => item.id);
}
async function deleteIds(table: 'provider_orders' | 'provider_payments' | 'provider_customers', ids: string[], userId: string) {
  if (!ids.length) return;
  const { error } = await client().from(table).delete().eq('user_id', userId).in('id', ids);
  throwIfError(error);
}

/** Syncs only changed rows. It deliberately avoids replacing the provider's entire dataset on each edit. */
export async function syncProviderChanges(userId: string, before: ProviderData, after: ProviderData): Promise<void> {
  const db = client();
  // Delete dependent rows before customers; insert customers before orders/payments.
  await deleteIds('provider_orders', removed(before.orders, after.orders), userId);
  await deleteIds('provider_payments', removed(before.payments, after.payments), userId);
  await deleteIds('provider_customers', removed(before.customers, after.customers), userId);

  const customers = changed(before.customers, after.customers);
  if (customers.length) {
    const { error } = await db.from('provider_customers').upsert(customers.map(c => customerRow(c, userId)), { onConflict: 'id' });
    throwIfError(error);
  }
  const orders = changed(before.orders, after.orders);
  if (orders.length) {
    const { error } = await db.from('provider_orders').upsert(orders.map(o => orderRow(o, userId)), { onConflict: 'id' });
    throwIfError(error);
  }
  const payments = changed(before.payments, after.payments);
  if (payments.length) {
    const { error } = await db.from('provider_payments').upsert(payments.map(p => paymentRow(p, userId)), { onConflict: 'id' });
    throwIfError(error);
  }
  if (JSON.stringify(before.prices) !== JSON.stringify(after.prices)) {
    const { error } = await db.from('provider_settings').upsert({ user_id: userId, prices: after.prices, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
    throwIfError(error);
  }
}
