ALTER TABLE public.materials ADD COLUMN IF NOT EXISTS file_hash TEXT;
CREATE INDEX IF NOT EXISTS materials_exam_hash_idx ON public.materials (exam_id, file_hash);

-- Grace buffer: a task may dip the balance to -3 BrainBucks before pausing.
CREATE OR REPLACE FUNCTION public.spend_gems(_cost integer, _reason text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare b integer;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if _cost <= 0 then raise exception 'bad cost'; end if;
  perform public.ensure_wallet();
  update gem_wallets set balance = balance - _cost, updated_at = now()
    where user_id = auth.uid() and balance - _cost >= -3 returning balance into b;
  if b is null then raise exception 'NOT_ENOUGH_GEMS'; end if;
  insert into gem_ledger(user_id, delta, reason) values (auth.uid(), -_cost, _reason);
  return b;
end $$;