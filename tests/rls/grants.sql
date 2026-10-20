-- Supabase grants these table privileges by default; RLS then filters rows.
grant usage on schema public, auth to authenticated, anon;
grant execute on function auth.uid() to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated, anon;
