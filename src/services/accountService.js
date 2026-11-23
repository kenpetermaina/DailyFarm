import { supabase } from '../lib/supabase';

export async function updateProfile(userId, { full_name, phone }) {
  const { error } = await supabase.from('profiles').update({ full_name, phone }).eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function updateFarmName(farmId, farm_name) {
  const { error } = await supabase.from('farms').update({ farm_name }).eq('id', farmId);
  if (error) throw new Error(error.message);
}

export async function changePassword(email, currentPassword, newPassword) {
  // Confirm the current password first so a stolen open session cannot silently change it.
  const check = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (check.error) throw new Error('Your current password is not correct.');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
}

export async function loadSampleData(today) {
  const { error } = await supabase.rpc('load_sample_data', { p_today: today });
  if (error) throw new Error(error.message);
}

export async function clearSampleData() {
  const { data, error } = await supabase.rpc('clear_sample_data');
  if (error) throw new Error(error.message);
  return data;
}
