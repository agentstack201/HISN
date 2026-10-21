-- RLS behaviour tests. Each block raises an exception if a rule is broken.
-- Users: A = 0000...0a, B = 0000...0b
insert into auth.users values ('00000000-0000-0000-0000-00000000000a', 'a@test'), ('00000000-0000-0000-0000-00000000000b', 'b@test');

set role authenticated;

-- User A creates a target, scan and finding.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
insert into public.targets (id, name, url) values ('10000000-0000-0000-0000-00000000000a', 'A site', 'https://a.example');
insert into public.scans (id, target_id) values ('20000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000a');
insert into public.findings (scan_id, check_key, title, severity, description, evidence, remediation, confidence, status)
  values ('20000000-0000-0000-0000-00000000000a', 'header.csp', 'Missing CSP', 'medium', 'd', 'e', 'r', 'high', 'failed');
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAIL: A should see exactly own profile'; end if;
  if (select count(*) from public.findings) <> 1 then raise exception 'FAIL: A should see own finding'; end if;
  raise notice 'PASS: owner can create and read own target/scan/finding';
end $$;

-- User B must see nothing of A's data.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  if (select count(*) from public.targets) <> 0 then raise exception 'FAIL: B sees A targets'; end if;
  if (select count(*) from public.scans) <> 0 then raise exception 'FAIL: B sees A scans'; end if;
  if (select count(*) from public.findings) <> 0 then raise exception 'FAIL: B sees A findings'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAIL: B sees other profiles'; end if;
  raise notice 'PASS: user B cannot read user A data';
end $$;

-- B cannot modify or delete A's rows (statements affect 0 rows).
do $$ declare n int; begin
  update public.targets set name = 'hacked' where id = '10000000-0000-0000-0000-00000000000a';
  get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL: B updated A target'; end if;
  delete from public.targets where id = '10000000-0000-0000-0000-00000000000a';
  get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL: B deleted A target'; end if;
  raise notice 'PASS: user B cannot update or delete user A targets';
end $$;

-- B cannot create a scan on A's target, even with its own user_id.
do $$ begin
  begin
    insert into public.scans (target_id) values ('10000000-0000-0000-0000-00000000000a');
    raise exception 'FAIL: B created scan on A target';
  exception when insufficient_privilege then raise notice 'PASS: scan insert on foreign target rejected'; end;
end $$;

-- B cannot move its own scan onto A's target.
insert into public.targets (id, name, url) values ('10000000-0000-0000-0000-00000000000b', 'B site', 'https://b.example');
insert into public.scans (id, target_id) values ('20000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-00000000000b');
do $$ begin
  begin
    update public.scans set target_id = '10000000-0000-0000-0000-00000000000a' where id = '20000000-0000-0000-0000-00000000000b';
    raise exception 'FAIL: B re-pointed scan to A target';
  exception when insufficient_privilege then raise notice 'PASS: scan cannot be moved to a foreign target'; end;
end $$;

-- B cannot inject findings into A's scan.
do $$ begin
  begin
    insert into public.findings (scan_id, check_key, title, severity, description, evidence, remediation, confidence, status)
      values ('20000000-0000-0000-0000-00000000000a', 'x', 'fake', 'critical', 'd', 'e', 'r', 'high', 'failed');
    raise exception 'FAIL: B inserted finding into A scan';
  exception when insufficient_privilege then raise notice 'PASS: finding insert into foreign scan rejected'; end;
end $$;

-- B cannot create a target owned by A.
do $$ begin
  begin
    insert into public.targets (user_id, name, url) values ('00000000-0000-0000-0000-00000000000a', 'x', 'https://x.example');
    raise exception 'FAIL: B created target for A';
  exception when insufficient_privilege then raise notice 'PASS: target insert for another user rejected'; end;
end $$;

-- A cannot add findings once a scan is completed (results are immutable).
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
update public.scans set status = 'completed' where id = '20000000-0000-0000-0000-00000000000a';
do $$ begin
  begin
    insert into public.findings (scan_id, check_key, title, severity, description, evidence, remediation, confidence, status)
      values ('20000000-0000-0000-0000-00000000000a', 'x', 'late', 'low', 'd', 'e', 'r', 'high', 'failed');
    raise exception 'FAIL: finding added to completed scan';
  exception when insufficient_privilege then raise notice 'PASS: completed scans cannot receive new findings'; end;
end $$;

-- Anonymous visitors see nothing.
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  if (select count(*) from public.targets) + (select count(*) from public.findings) <> 0 then raise exception 'FAIL: anon sees data'; end if;
  raise notice 'PASS: anonymous users see no data';
end $$;
reset role;

-- Constraint checks.
do $$ begin
  begin
    insert into public.findings (scan_id, check_key, title, severity, description, evidence, remediation, confidence, status)
      values ('20000000-0000-0000-0000-00000000000a', 'x', 't', 'severe', 'd', 'e', 'r', 'high', 'failed');
    raise exception 'FAIL: invalid severity accepted';
  exception when check_violation then raise notice 'PASS: invalid severity rejected by constraint'; end;
end $$;
