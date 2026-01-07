-- Create Operating Schedules (Regular Hours)
create table public.operating_schedules (
    id uuid not null default gen_random_uuid (),
    restaurant_id uuid not null,
    day_of_week integer not null, -- 0 = Sunday, 1 = Monday, etc.
    open_time time without time zone not null default '19:00:00',
    close_time time without time zone not null default '00:00:00',
    is_closed boolean not null default false,
    created_at timestamp with time zone null default now(),
    constraint operating_schedules_pkey primary key (id),
    constraint operating_schedules_restaurant_id_fkey foreign KEY (restaurant_id) references restaurants (id) on delete CASCADE,
    constraint operating_schedules_unique_day unique (restaurant_id, day_of_week)
) TABLESPACE pg_default;

-- Create Day Configurations (Special Events / Exceptions)
create table public.day_configurations (
    id uuid not null default gen_random_uuid (),
    restaurant_id uuid not null,
    date date not null,
    is_special_event boolean not null default false,
    event_name text null,
    custom_time_slots jsonb null, -- Array of strings e.g. ["20:00", "22:00"]
    is_closed boolean not null default false,
    created_at timestamp with time zone null default now(),
    constraint day_configurations_pkey primary key (id),
    constraint day_configurations_restaurant_id_fkey foreign KEY (restaurant_id) references restaurants (id) on delete CASCADE,
    constraint day_configurations_unique_date unique (restaurant_id, date)
) TABLESPACE pg_default;

-- RLS Policies (Security)
alter table public.operating_schedules enable row level security;
alter table public.day_configurations enable row level security;

create policy "Users can view their restaurant schedules"
on public.operating_schedules for select
using (restaurant_id in (select id from restaurants where owner_id = auth.uid()));

create policy "Users can update their restaurant schedules"
on public.operating_schedules for all
using (restaurant_id in (select id from restaurants where owner_id = auth.uid()));

create policy "Users can view their day configurations"
on public.day_configurations for select
using (restaurant_id in (select id from restaurants where owner_id = auth.uid()));

create policy "Users can update their day configurations"
on public.day_configurations for all
using (restaurant_id in (select id from restaurants where owner_id = auth.uid()));
