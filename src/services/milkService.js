import { supabase } from '../lib/supabase';

export const MILK_SELECT = 'id, farm_id, cow_id, session, quantity, record_date, notes, created_at, updated_at, cows(name, ear_tag)';
const PAGE = 1000; // Supabase returns at most 1000 rows per request, so we page through

const normalize = (r) => ({ ...r, quantity: Number(r.quantity) });

function toError(error) {
  const e = new Error(
    error.code === '23505' ? 'A record already exists for this cow, date and session.'
    : error.code === '23514' ? 'This entry is not allowed. Please check the details and try again.'
    : error.message
  );
  e.code = error.code;
  return e;
}

function applyFilters(q, f = {}) {
  if (f.cowId) q = q.eq('cow_id', f.cowId);
  if (f.cowIds) q = q.in('cow_id', f.cowIds);
  if (f.session) q = q.eq('session', f.session);
  if (f.from) q = q.gte('record_date', f.from);
  if (f.to) q = q.lte('record_date', f.to);
  return q;
}

/** Every record matching the filters (loops over pages of 1000). */
export async function fetchAllRecords(farmId, filters = {}, columns = MILK_SELECT) {
  if (filters.cowIds && filters.cowIds.length === 0) return [];
  const out = [];
  for (let start = 0; ; start += PAGE) {
    const q = applyFilters(supabase.from('milk_records').select(columns).eq('farm_id', farmId), filters)
      .order('record_date', { ascending: true })
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(start, start + PAGE - 1);
    const { data, error } = await q;
    if (error) throw toError(error);
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out.map(normalize);
}

/** One page of the Milk Records table plus the total row count. */
export async function listRecordsPage(farmId, filters, { page, pageSize, ascending }) {
  if (filters.cowIds && filters.cowIds.length === 0) return { rows: [], count: 0 };
  const q = applyFilters(supabase.from('milk_records').select(MILK_SELECT, { count: 'exact' }).eq('farm_id', farmId), filters)
    .order('record_date', { ascending })
    .order('created_at', { ascending })
    .order('id', { ascending: true })
    .range(page * pageSize, page * pageSize + pageSize - 1);
  const { data, error, count } = await q;
  if (error) throw toError(error);
  return { rows: data.map(normalize), count: count ?? 0 };
}

export async function listRecentRecords(farmId, limit = 8) {
  const { data, error } = await supabase.from('milk_records').select(MILK_SELECT).eq('farm_id', farmId)
    .order('record_date', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
  if (error) throw toError(error);
  return data.map(normalize);
}

export async function findRecord(cowId, date, session) {
  const { data, error } = await supabase.from('milk_records').select(MILK_SELECT)
    .eq('cow_id', cowId).eq('record_date', date).eq('session', session).maybeSingle();
  if (error) throw toError(error);
  return data ? normalize(data) : null;
}

export async function createRecord(rec) {
  const { data, error } = await supabase.from('milk_records').insert(rec).select(MILK_SELECT).single();
  if (error) throw toError(error);
  return normalize(data);
}

export async function updateRecord(id, patch) {
  const { data, error } = await supabase.from('milk_records').update(patch).eq('id', id).select(MILK_SELECT).single();
  if (error) throw toError(error);
  return normalize(data);
}

export async function deleteRecord(id) {
  const { error } = await supabase.from('milk_records').delete().eq('id', id);
  if (error) throw toError(error);
}
