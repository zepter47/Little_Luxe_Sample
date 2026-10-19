-- Email access is limited to authors of stock records visible to the caller.
create schema if not exists private;
create or replace function private.stock_author_emails(author_ids uuid[])
returns table(user_id uuid, email text)
language sql stable security definer set search_path = ''
as $$
  select u.id, u.email::text from auth.users u
  where auth.uid() is not null and u.id = any(author_ids)
    and (
      u.id = auth.uid()
      or (public.authorize('orders.read'::public.app_permission) and exists(select 1 from public."order" o where o.added_by = u.id))
      or (public.authorize('purchases.read'::public.app_permission) and exists(select 1 from public.purchase p where p.added_by = u.id))
      or (public.authorize('item_returns.read'::public.app_permission) and exists(select 1 from public.item_return r where r.added_by = u.id))
    )
$$;
revoke all on function private.stock_author_emails(uuid[]) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.stock_author_emails(uuid[]) to authenticated;
create or replace function public.stock_author_emails(author_ids uuid[])
returns table(user_id uuid, email text)
language sql stable security invoker set search_path = ''
as $$ select * from private.stock_author_emails(author_ids) $$;
revoke all on function public.stock_author_emails(uuid[]) from public, anon;
grant execute on function public.stock_author_emails(uuid[]) to authenticated;
