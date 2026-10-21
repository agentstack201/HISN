-- DEV/TEST ONLY: creates two confirmed users (hisn-test-a/b@example.com, password TestPass#12345) so e2e-auth tests can run.
-- Run in the Supabase SQL editor; delete them afterwards (see the cleanup line at the bottom). Never keep them in production.
do $$
declare uid uuid; em text;
begin
  foreach em in array array['hisn-test-a@example.com','hisn-test-b@example.com'] loop
    if not exists (select 1 from auth.users where email = em) then
      uid := gen_random_uuid();
      insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change,email_change_token_new)
      values ('00000000-0000-0000-0000-000000000000',uid,'authenticated','authenticated',em,crypt('TestPass#12345',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
      insert into auth.identities (id,user_id,provider_id,provider,identity_data,last_sign_in_at,created_at,updated_at)
      values (gen_random_uuid(),uid,uid::text,'email',jsonb_build_object('sub',uid::text,'email',em,'email_verified',true),now(),now(),now());
    end if;
  end loop;
end $$;
-- cleanup: delete from auth.users where email in ('hisn-test-a@example.com','hisn-test-b@example.com');
