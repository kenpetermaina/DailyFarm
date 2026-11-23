-- Optional: load sample data for the FIRST farm in the database (run in the SQL Editor).
-- Easier alternative: log in and use Settings -> "Load sample data".
-- Requires migrations 001 and 002 to be applied.
select public.seed_sample_data_for_farm(
  (select id from public.farms order by created_at limit 1),
  current_date
);

-- To remove sample data again (real records stay):
-- delete from public.milk_records where is_sample = true;
-- delete from public.cows c where is_sample = true
--   and not exists (select 1 from public.milk_records m where m.cow_id = c.id);
