revoke execute on function public.refund_gems(integer, text) from authenticated;
comment on function public.refund_gems(integer, text) is 'DEPRECATED: refunds go through credit_gems from the server';