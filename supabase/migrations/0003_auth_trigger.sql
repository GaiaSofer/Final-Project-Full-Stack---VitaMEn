-- Auto-create a profile row whenever an auth user is created. This removes the
-- timing/RLS fragility of creating the profile from the browser after signup.
-- Reads role + name from the signup metadata; defaults to 'client'.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'client')::user_role,
    coalesce(new.raw_user_meta_data->>'full_name', 'User')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
