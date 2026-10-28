ALTER TABLE public.gem_wallets DROP CONSTRAINT gem_wallets_balance_check;
ALTER TABLE public.gem_wallets ADD CONSTRAINT gem_wallets_balance_check CHECK (balance >= -3);
COMMENT ON CONSTRAINT gem_wallets_balance_check ON public.gem_wallets IS 'Allow the promised three BrainBucks grace buffer; spend_gems atomically rejects spends below -3.';