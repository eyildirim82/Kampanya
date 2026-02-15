-- Create campaigns table
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Add campaign_id to applications
alter table public.applications 
add column campaign_id uuid references public.campaigns(id);

-- Create a default campaign
insert into public.campaigns (title, is_active)
values ('Genel Başvuru', true);

-- Link existing applications to the default campaign
update public.applications 
set campaign_id = (select id from public.campaigns where title = 'Genel Başvuru' limit 1)
where campaign_id is null;

-- Make campaign_id not null (optional, but good for data integrity)
-- alter table public.applications alter column campaign_id set not null;

-- Enable RLS on campaigns
alter table public.campaigns enable row level security;

-- Policy: Public read access to active campaigns
create policy "Public active campaigns"
on public.campaigns for select
to public
using (is_active = true);

-- Policy: Admin full access to campaigns
create policy "Admins full access"
on public.campaigns for all
to authenticated
using (
  exists (
    select 1 from public.admins 
    where id = auth.uid()
  )
);
