create table public.exam_plans (
  user_id uuid not null,
  exam_id uuid not null references public.exams(id) on delete cascade,
  kind text not null default 'exam' check (kind in ('test','exam','homework')),
  due_date date,
  updated_at timestamptz not null default now(),
  primary key (user_id, exam_id)
);
grant select, insert, update, delete on public.exam_plans to authenticated;
grant all on public.exam_plans to service_role;
alter table public.exam_plans enable row level security;
create policy "own plans" on public.exam_plans for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.can_read_exam(exam_id));

create table public.gem_wallets (
  user_id uuid primary key,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
grant select on public.gem_wallets to authenticated;
grant all on public.gem_wallets to service_role;
alter table public.gem_wallets enable row level security;
create policy "read own wallet" on public.gem_wallets for select to authenticated using (user_id = auth.uid());

create table public.gem_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  delta integer not null,
  reason text not null,
  ref text,
  created_at timestamptz not null default now()
);
create unique index gem_ledger_ref_uniq on public.gem_ledger(ref) where ref is not null;
grant select on public.gem_ledger to authenticated;
grant all on public.gem_ledger to service_role;
alter table public.gem_ledger enable row level security;
create policy "read own ledger" on public.gem_ledger for select to authenticated using (user_id = auth.uid());

-- Welcome gems are granted once per user on first wallet access.
create or replace function public.ensure_wallet() returns integer
language plpgsql security definer set search_path = public as $$
declare b integer;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into gem_wallets(user_id, balance) values (auth.uid(), 25) on conflict do nothing;
  if found then insert into gem_ledger(user_id, delta, reason) values (auth.uid(), 25, 'Welcome gems'); end if;
  select balance into b from gem_wallets where user_id = auth.uid();
  return b;
end $$;

-- Atomic spend for the signed-in user; raises when balance is too low.
create or replace function public.spend_gems(_cost integer, _reason text) returns integer
language plpgsql security definer set search_path = public as $$
declare b integer;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if _cost <= 0 then raise exception 'bad cost'; end if;
  perform public.ensure_wallet();
  update gem_wallets set balance = balance - _cost, updated_at = now()
    where user_id = auth.uid() and balance >= _cost returning balance into b;
  if b is null then raise exception 'NOT_ENOUGH_GEMS'; end if;
  insert into gem_ledger(user_id, delta, reason) values (auth.uid(), -_cost, _reason);
  return b;
end $$;

-- Refund for a failed AI action (only callable by the same user, only up to what they spent).
create or replace function public.refund_gems(_cost integer, _reason text) returns integer
language plpgsql security definer set search_path = public as $$
declare b integer;
begin
  if auth.uid() is null or _cost <= 0 or _cost > 20 then raise exception 'bad refund'; end if;
  update gem_wallets set balance = balance + _cost, updated_at = now() where user_id = auth.uid() returning balance into b;
  insert into gem_ledger(user_id, delta, reason) values (auth.uid(), _cost, 'Refund: ' || _reason);
  return b;
end $$;

-- Purchases are credited by the payment webhook only (service role).
create or replace function public.credit_gems(_user uuid, _amount integer, _reason text, _ref text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into gem_ledger(user_id, delta, reason, ref) values (_user, _amount, _reason, _ref);
  insert into gem_wallets(user_id, balance) values (_user, _amount)
    on conflict (user_id) do update set balance = gem_wallets.balance + _amount, updated_at = now();
end $$;

revoke all on function public.ensure_wallet() from public, anon;
revoke all on function public.spend_gems(integer, text) from public, anon;
revoke all on function public.refund_gems(integer, text) from public, anon;
revoke all on function public.credit_gems(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.ensure_wallet() to authenticated;
grant execute on function public.spend_gems(integer, text) to authenticated;
grant execute on function public.refund_gems(integer, text) to authenticated;
grant execute on function public.credit_gems(uuid, integer, text, text) to service_role;