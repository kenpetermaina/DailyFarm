import { supabase } from '../lib/supabase';

function toError(error) {
  const e = new Error(error.code === '23505' ? 'Another cow on your farm already uses this ear tag.' : error.message);
  e.code = error.code;
  return e;
}

export async function listCows(farmId) {
  const { data, error } = await supabase.from('cows').select('*').eq('farm_id', farmId).order('name', { ascending: true });
  if (error) throw toError(error);
  return data;
}

export async function getCow(id) {
  const { data, error } = await supabase.from('cows').select('*').eq('id', id).maybeSingle();
  if (error) throw toError(error);
  return data;
}

export async function createCow(cow) {
  const { data, error } = await supabase.from('cows').insert(cow).select().single();
  if (error) throw toError(error);
  return data;
}

export async function updateCow(id, patch) {
  const { data, error } = await supabase.from('cows').update(patch).eq('id', id).select().single();
  if (error) throw toError(error);
  return data;
}

/** Uploads a photo to <farm_id>/<random>.<ext> and returns its public URL. */
export async function uploadCowPhoto(farmId, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${farmId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('cow-photos').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return supabase.storage.from('cow-photos').getPublicUrl(path).data.publicUrl;
}
