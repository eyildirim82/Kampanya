-- Safely create campaigns table if it doesn't exist
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Safely add campaign_id to applications
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name='applications' and column_name='campaign_id') then
    alter table public.applications add column campaign_id uuid references public.campaigns(id);
  end if;
end $$;

-- Insert default campaign if not exists
insert into public.campaigns (title, is_active)
select 'Genel Başvuru', true
where not exists (select 1 from public.campaigns where title = 'Genel Başvuru');

-- Link existing applications to the default campaign if null
update public.applications 
set campaign_id = (select id from public.campaigns where title = 'Genel Başvuru' limit 1)
where campaign_id is null;

-- Enable RLS on campaigns (idempotent-ish, safe to re-run usually, but 'alter table' might not fail if already enabled)
alter table public.campaigns enable row level security;

-- Drop policies to recreate them safely
drop policy if exists "Public active campaigns" on public.campaigns;
drop policy if exists "Admins full access" on public.campaigns;

-- Recreate policies
create policy "Public active campaigns"
on public.campaigns for select
to public
using (is_active = true);

create policy "Admins full access"
on public.campaigns for all
to authenticated
using (
  exists (
    select 1 from public.admins 
    where id = auth.uid()
  )
);
