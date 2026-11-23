-- =====================================================================
-- Optional sample data. Sample rows are flagged is_sample = true so they
-- can be told apart from, and removed without touching, real records.
-- =====================================================================

-- Internal helper (not callable from the browser)
create or replace function public.seed_sample_data_for_farm(p_farm_id uuid, p_today date default current_date)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.cows (farm_id, name, ear_tag, breed, date_of_birth, weight, status, is_sample, notes) values
    (p_farm_id, 'Daisy', 'C001', 'Friesian',  '2020-03-14', 580, 'ACTIVE', true, 'Sample data'),
    (p_farm_id, 'Bella', 'C002', 'Ayrshire',  '2019-08-02', 520, 'ACTIVE', true, 'Sample data'),
    (p_farm_id, 'Misty', 'C003', 'Jersey',    '2021-01-21', 430, 'ACTIVE', true, 'Sample data'),
    (p_farm_id, 'Rose',  'C004', 'Friesian',  '2020-11-09', 565, 'ACTIVE', true, 'Sample data'),
    (p_farm_id, 'Lucy',  'C005', 'Guernsey',  '2022-04-30', 470, 'ACTIVE', true, 'Sample data')
  on conflict (farm_id, ear_tag) do nothing;

  -- 45 days of records, three sessions per cow, with natural variation
  insert into public.milk_records (farm_id, cow_id, session, quantity, record_date, is_sample)
  select c.farm_id, c.id, s.session,
         round((
           case c.ear_tag when 'C001' then 9 when 'C002' then 7 when 'C003' then 5.5 when 'C004' then 8.5 else 6.5 end
           * case s.session when 'MORNING' then 1.0 when 'LUNCH' then 0.55 else 0.85 end
           * (0.85 + random() * 0.3)
         )::numeric, 2),
         p_today - g.n,
         true
  from public.cows c
  cross join (values ('MORNING'), ('LUNCH'), ('EVENING')) as s(session)
  cross join generate_series(0, 44) as g(n)
  where c.farm_id = p_farm_id and c.is_sample = true and random() > 0.03
  on conflict (cow_id, record_date, session) do nothing;
end $$;

revoke execute on function public.seed_sample_data_for_farm(uuid, date) from public, anon, authenticated;

-- Called from Settings -> "Load sample data"
create or replace function public.load_sample_data(p_today date default current_date)
returns void language plpgsql security definer set search_path = public as $$
declare v_farm uuid;
begin
  select id into v_farm from public.farms where owner_id = auth.uid();
  if v_farm is null then raise exception 'No farm found for this account.'; end if;
  perform public.seed_sample_data_for_farm(v_farm, p_today);
end $$;

-- Called from Settings -> "Remove sample data". Real data is never touched.
create or replace function public.clear_sample_data()
returns integer language plpgsql security definer set search_path = public as $$
declare v_farm uuid; v_deleted integer;
begin
  select id into v_farm from public.farms where owner_id = auth.uid();
  if v_farm is null then raise exception 'No farm found for this account.'; end if;

  delete from public.milk_records where farm_id = v_farm and is_sample = true;
  get diagnostics v_deleted = row_count;

  delete from public.cows c
   where c.farm_id = v_farm and c.is_sample = true
     and not exists (select 1 from public.milk_records m where m.cow_id = c.id);
  return v_deleted;
end $$;

revoke execute on function public.load_sample_data(date), public.clear_sample_data() from public, anon;
grant  execute on function public.load_sample_data(date), public.clear_sample_data() to authenticated;
