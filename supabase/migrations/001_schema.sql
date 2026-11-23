-- =====================================================================
-- DairyFarm Manager - core schema, constraints, triggers and security
-- Run this first (Supabase dashboard -> SQL Editor), then 002.
-- =====================================================================

-- ---------- TABLES ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.farms (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null unique references auth.users(id) on delete cascade, -- one farm per farmer
  farm_name   text not null check (char_length(btrim(farm_name)) > 0),
  created_at  timestamptz not null default now()
);

create table if not exists public.cows (
  id             uuid primary key default gen_random_uuid(),
  farm_id        uuid not null references public.farms(id) on delete cascade,
  name           text not null check (char_length(btrim(name)) > 0),
  ear_tag        text not null check (char_length(btrim(ear_tag)) > 0),
  breed          text,
  date_of_birth  date,
  weight         numeric check (weight is null or weight > 0),
  photo_url      text,
  notes          text,
  status         text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE')),
  is_sample      boolean not null default false,   -- true = optional test data
  created_at     timestamptz not null default now(),
  constraint cows_farm_ear_tag_key unique (farm_id, ear_tag)
);

create table if not exists public.milk_records (
  id           uuid primary key default gen_random_uuid(),
  farm_id      uuid not null references public.farms(id) on delete cascade,
  cow_id       uuid not null references public.cows(id) on delete restrict, -- history is never lost
  session      text not null check (session in ('MORNING','LUNCH','EVENING')),
  quantity     numeric(10,2) not null check (quantity > 0),
  record_date  date not null,
  notes        text,
  is_sample    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint milk_records_cow_date_session_key unique (cow_id, record_date, session)
);

-- ---------- INDEXES ----------
create index if not exists cows_farm_idx            on public.cows (farm_id, status);
create index if not exists milk_farm_date_idx       on public.milk_records (farm_id, record_date);
create index if not exists milk_cow_date_idx        on public.milk_records (cow_id, record_date);
create index if not exists milk_farm_created_idx    on public.milk_records (farm_id, created_at desc);

-- ---------- TRIGGERS ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists milk_records_set_updated_at on public.milk_records;
create trigger milk_records_set_updated_at
  before update on public.milk_records
  for each row execute function public.set_updated_at();

-- A milk record's farm must match the cow's farm (stops cross-farm inserts)
create or replace function public.enforce_milk_farm_match()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.cows c where c.id = new.cow_id and c.farm_id = new.farm_id) then
    raise exception 'This cow does not belong to your farm.' using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists milk_records_farm_match on public.milk_records;
create trigger milk_records_farm_match
  before insert or update of cow_id, farm_id on public.milk_records
  for each row execute function public.enforce_milk_farm_match();

-- On sign-up: create the profile and the farm from the registration form data
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'phone');

  insert into public.farms (owner_id, farm_name)
  values (new.id, coalesce(nullif(btrim(new.raw_user_meta_data ->> 'farm_name'), ''), 'My Farm'));

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- ROW LEVEL SECURITY ----------
create or replace function public.owns_farm(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.farms f where f.id = fid and f.owner_id = auth.uid());
$$;

alter table public.profiles      enable row level security;
alter table public.farms         enable row level security;
alter table public.cows          enable row level security;
alter table public.milk_records  enable row level security;

revoke all on public.profiles, public.farms, public.cows, public.milk_records from anon;

-- profiles: own row only
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- farms: own farm only (created by the sign-up trigger, so no client INSERT/DELETE)
drop policy if exists farms_select_own on public.farms;
drop policy if exists farms_update_own on public.farms;
create policy farms_select_own on public.farms for select to authenticated using (owner_id = auth.uid());
create policy farms_update_own on public.farms for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- cows: only cows of my farm. No DELETE policy: cows are deactivated, never deleted.
drop policy if exists cows_select_own on public.cows;
drop policy if exists cows_insert_own on public.cows;
drop policy if exists cows_update_own on public.cows;
create policy cows_select_own on public.cows for select to authenticated using (public.owns_farm(farm_id));
create policy cows_insert_own on public.cows for insert to authenticated with check (public.owns_farm(farm_id));
create policy cows_update_own on public.cows for update to authenticated using (public.owns_farm(farm_id)) with check (public.owns_farm(farm_id));

-- milk_records: only records of my farm (trigger above also checks the cow)
drop policy if exists milk_select_own on public.milk_records;
drop policy if exists milk_insert_own on public.milk_records;
drop policy if exists milk_update_own on public.milk_records;
drop policy if exists milk_delete_own on public.milk_records;
create policy milk_select_own on public.milk_records for select to authenticated using (public.owns_farm(farm_id));
create policy milk_insert_own on public.milk_records for insert to authenticated with check (public.owns_farm(farm_id));
create policy milk_update_own on public.milk_records for update to authenticated using (public.owns_farm(farm_id)) with check (public.owns_farm(farm_id));
create policy milk_delete_own on public.milk_records for delete to authenticated using (public.owns_farm(farm_id));

-- ---------- STORAGE: cow photos ----------
-- Files are stored under "<farm_id>/<file>". Only the farm owner can write to their folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cow-photos', 'cow-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists cow_photos_insert on storage.objects;
drop policy if exists cow_photos_update on storage.objects;
drop policy if exists cow_photos_delete on storage.objects;
create policy cow_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'cow-photos' and (storage.foldername(name))[1] in (select id::text from public.farms where owner_id = auth.uid()));
create policy cow_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'cow-photos' and (storage.foldername(name))[1] in (select id::text from public.farms where owner_id = auth.uid()));
create policy cow_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cow-photos' and (storage.foldername(name))[1] in (select id::text from public.farms where owner_id = auth.uid()));
