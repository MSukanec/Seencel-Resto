# Detalle de Tablas

ATENCION: NUNCA MODIFICAR TU! ESTO ES SOLO PARA MI Y QUE TU LEAS

# Tabla CUSTOMER_ATTRIBUTES:

create table public.customer_attributes (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone null default now(),
  name text not null,
  category text not null,
  icon text null,
  color text null,
  is_active boolean not null default true,
  restaurant_id uuid null,
  position integer not null default 0,
  updated_at timestamp with time zone null default now(),
  constraint customer_attributes_pkey primary key (id),
  constraint customer_attributes_restaurant_id_fkey foreign KEY (restaurant_id) references restaurants (id) on delete CASCADE,
  constraint customer_attributes_category_check check (
    (
      category = any (
        array[
          'dietary'::text,
          'accessibility'::text,
          'family'::text,
          'occasion'::text,
          'preference'::text,
          'status'::text,
          'other'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;
bla 

# Tabla CUSTOMER_TAGS:

create table public.customer_tags (
  customer_id uuid not null,
  attribute_id uuid not null,
  created_at timestamp with time zone null default now(),
  constraint customer_tags_pkey primary key (customer_id, attribute_id),
  constraint customer_tags_attribute_id_fkey foreign KEY (attribute_id) references customer_attributes (id) on delete CASCADE,
  constraint customer_tags_customer_id_fkey foreign KEY (customer_id) references customers (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_customer_tags_customer on public.customer_tags using btree (customer_id) TABLESPACE pg_default;

create index IF not exists idx_customer_tags_attribute on public.customer_tags using btree (attribute_id) TABLESPACE pg_default;

# Tabla CUSTOMERS:

create table public.customers (
  id uuid not null default gen_random_uuid (),
  restaurant_id uuid not null,
  first_name text not null,
  last_name text null,
  phone text null,
  email text null,
  observations text null,
  address_raw text null,
  latitude numeric null,
  longitude numeric null,
  google_place_id text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  is_active boolean not null default true,
  visit_count integer not null default 0,
  last_visit_at timestamp with time zone null,
  address_floor text null,
  address_apartment text null,
  delivery_notes text null,
  constraint customers_pkey primary key (id),
  constraint customers_restaurant_id_fkey foreign KEY (restaurant_id) references restaurants (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_customers_restaurant on public.customers using btree (restaurant_id) TABLESPACE pg_default;

create index IF not exists idx_customers_phone on public.customers using btree (phone) TABLESPACE pg_default
where
  (phone is not null);

create index IF not exists idx_customers_email on public.customers using btree (email) TABLESPACE pg_default
where
  (email is not null);

create trigger update_customers_updated_at BEFORE
update on customers for EACH row
execute FUNCTION update_updated_at_column ();

# Tabla DAY_CONFIGURATIONS:

create table public.day_configurations (
  id uuid not null default gen_random_uuid (),
  restaurant_id uuid not null,
  date date not null,
  is_special_event boolean not null default false,
  event_name text null,
  custom_time_slots jsonb null,
  is_closed boolean not null default false,
  created_at timestamp with time zone null default now(),
  layout_template_id uuid null,
  updated_at timestamp with time zone null default now(),
  active_menu_id uuid null,
  constraint day_configurations_pkey primary key (id),
  constraint day_configurations_unique_date unique (restaurant_id, date),
  constraint day_configurations_active_menu_id_fkey foreign KEY (active_menu_id) references menus (id) on delete set null,
  constraint day_configurations_layout_template_id_fkey foreign KEY (layout_template_id) references layout_templates (id) on delete set null,
  constraint day_configurations_restaurant_id_fkey foreign KEY (restaurant_id) references restaurants (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_day_configurations_restaurant_date on public.day_configurations using btree (restaurant_id, date) TABLESPACE pg_default;

create trigger update_day_configurations_updated_at BEFORE
update on day_configurations for EACH row
execute FUNCTION update_updated_at_column ();

# Tabla FLOOR_OBJECTS:

create table public.floor_objects (
  id uuid not null default gen_random_uuid (),
  floor_id uuid not null,
  type text not null,
  x numeric not null default 0,
  y numeric not null default 0,
  width numeric not null,
  height numeric not null,
  angle numeric not null default 0,
  properties jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  label text null,
  constraint floor_objects_pkey primary key (id),
  constraint floor_objects_floor_id_fkey foreign KEY (floor_id) references floors (id) on delete CASCADE,
  constraint floor_objects_type_check check (
    (
      type = any (
        array[
          'wall'::text,
          'door'::text,
          'window'::text,
          'plant'::text,
          'pillar'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_floor_objects_floor on public.floor_objects using btree (floor_id) TABLESPACE pg_default;

# Tabla FLOORS:

create table public.floors (
  id uuid not null default gen_random_uuid (),
  restaurant_id uuid not null,
  name text not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  position integer not null default 0,
  is_active boolean not null default true,
  constraint floors_pkey primary key (id),
  constraint floors_restaurant_id_fkey foreign KEY (restaurant_id) references restaurants (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger update_floors_updated_at BEFORE
update on floors for EACH row
execute FUNCTION update_updated_at_column ();

# Tabla KITCHEN_SECTORS:

create table public.kitchen_sectors (
  id uuid not null default gen_random_uuid (),
  restaurant_id uuid not null,
  name text not null,
  description text null,
  color text null default '#10b981'::text,
  icon text null default 'chef-hat'::text,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint kitchen_sectors_pkey primary key (id),
  constraint kitchen_sectors_restaurant_id_fkey foreign KEY (restaurant_id) references restaurants (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_kitchen_sectors_restaurant on public.kitchen_sectors using btree (restaurant_id) TABLESPACE pg_default;

create trigger update_kitchen_sectors_updated_at BEFORE
update on kitchen_sectors for EACH row
execute FUNCTION update_updated_at_column ();

# Tabla LAYOUT_TEMPLATE_ITEMS:

create table public.layout_template_items (
  id uuid not null default gen_random_uuid (),
  template_id uuid not null,
  floor_id uuid not null,
  label text not null,
  x numeric not null,
  y numeric not null,
  width numeric not null,
  height numeric not null,
  shape text not null default 'rectangle'::text,
  seats integer not null default 4,
  angle numeric not null default 0,
  seating jsonb null,
  merged_group uuid null,
  constraint layout_template_items_pkey primary key (id),
  constraint layout_template_items_floor_id_fkey foreign KEY (floor_id) references floors (id) on delete CASCADE,
  constraint layout_template_items_template_id_fkey foreign KEY (template_id) references layout_templates (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_layout_template_items_template on public.layout_template_items using btree (template_id) TABLESPACE pg_default;

create index IF not exists idx_layout_template_items_floor on public.layout_template_items using btree (floor_id) TABLESPACE pg_default;

# Tabla LAYOUT_TEMPLATES:

create table public.layout_templates (
  id uuid not null default gen_random_uuid (),
  restaurant_id uuid not null,
  name text not null,
  description text null,
  is_active boolean null default false,
  created_at timestamp with time zone null default now(),
  constraint layout_templates_pkey primary key (id),
  constraint layout_templates_restaurant_id_fkey foreign KEY (restaurant_id) references restaurants (id) on delete CASCADE
) TABLESPACE pg_default;

# Tabla MENU_CATEGORIES:

create table public.menu_categories (
  id uuid not null default gen_random_uuid (),
  restaurant_id uuid not null,
  name text not null,
  description text null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  image_url text null,
  constraint menu_categories_pkey primary key (id),
  constraint menu_categories_restaurant_id_fkey foreign KEY (restaurant_id) references restaurants (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_menu_categories_restaurant on public.menu_categories using btree (restaurant_id) TABLESPACE pg_default;

create trigger set_menu_categories_updated_at BEFORE
update on menu_categories for EACH row
execute FUNCTION handle_updated_at ();

# Tabla MENU_ITEM_TAGS:

create table public.menu_item_tags (
  menu_item_id uuid not null,
  tag_id uuid not null,
  created_at timestamp with time zone null default now(),
  constraint menu_item_tags_pkey primary key (menu_item_id, tag_id),
  constraint menu_item_tags_menu_item_id_fkey foreign KEY (menu_item_id) references menu_items (id) on delete CASCADE,
  constraint menu_item_tags_tag_id_fkey foreign KEY (tag_id) references tags (id) on delete CASCADE
) TABLESPACE pg_default;

# Tabla MENU_ITEMS:

create table public.menu_items (
  id uuid not null default gen_random_uuid (),
  category_id uuid not null,
  name text not null,
  description text null,
  price numeric not null default 0,
  image_url text null,
  sort_order integer not null default 0,
  is_available boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  preparation_time_minutes integer null,
  is_featured boolean not null default false,
  variants jsonb null,
  code character varying(50) null default null::character varying,
  sector_id uuid null,
  recipe text null,
  constraint menu_items_pkey primary key (id),
  constraint menu_items_category_id_fkey foreign KEY (category_id) references menu_categories (id) on delete CASCADE,
  constraint menu_items_sector_id_fkey foreign KEY (sector_id) references kitchen_sectors (id) on delete set null,
  constraint menu_items_price_positive check ((price >= (0)::numeric))
) TABLESPACE pg_default;

create index IF not exists idx_menu_items_category on public.menu_items using btree (category_id) TABLESPACE pg_default;

create index IF not exists idx_menu_items_code on public.menu_items using btree (code) TABLESPACE pg_default;

create index IF not exists idx_menu_items_sector on public.menu_items using btree (sector_id) TABLESPACE pg_default;

create trigger set_menu_items_updated_at BEFORE
update on menu_items for EACH row
execute FUNCTION handle_updated_at ();

# Tabla MENU_ITEMS:

create table public.menu_menu_items (
  menu_id uuid not null,
  menu_item_id uuid not null,
  sort_order integer not null default 0,
  price_override numeric null,
  is_available boolean not null default true,
  created_at timestamp with time zone null default now(),
  constraint menu_menu_items_pkey primary key (menu_id, menu_item_id),
  constraint menu_menu_items_menu_id_fkey foreign KEY (menu_id) references menus (id) on delete CASCADE,
  constraint menu_menu_items_menu_item_id_fkey foreign KEY (menu_item_id) references menu_items (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_menu_menu_items_menu on public.menu_menu_items using btree (menu_id) TABLESPACE pg_default;

create index IF not exists idx_menu_menu_items_item on public.menu_menu_items using btree (menu_item_id) TABLESPACE pg_default;

# Tabla MENUS:

create table public.menus (
  id uuid not null default gen_random_uuid (),
  restaurant_id uuid not null,
  name text not null,
  description text null,
  is_default boolean not null default false,
  is_active boolean not null default true,
  color text null default '#10b981'::text,
  icon text null default 'menu'::text,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint menus_pkey primary key (id),
  constraint menus_restaurant_id_fkey foreign KEY (restaurant_id) references restaurants (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_menus_restaurant on public.menus using btree (restaurant_id) TABLESPACE pg_default;

create trigger update_menus_updated_at BEFORE
update on menus for EACH row
execute FUNCTION update_updated_at_column ();

# Tabla OPERATING_SCHEDULES:

create table public.operating_schedules (
  id uuid not null default gen_random_uuid (),
  restaurant_id uuid not null,
  day_of_week integer not null,
  open_time time without time zone not null default '19:00:00'::time without time zone,
  close_time time without time zone not null default '00:00:00'::time without time zone,
  is_closed boolean not null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint operating_schedules_pkey primary key (id),
  constraint operating_schedules_unique_day unique (restaurant_id, day_of_week),
  constraint operating_schedules_restaurant_id_fkey foreign KEY (restaurant_id) references restaurants (id) on delete CASCADE
) TABLESPACE pg_default;

# Tabla ORDER_ITEMS:

create table public.order_items (
  id uuid not null default gen_random_uuid (),
  order_id uuid not null,
  menu_item_id uuid not null,
  quantity integer not null default 1,
  unit_price numeric not null,
  total_price numeric not null,
  selected_variant jsonb null,
  notes text null,
  status text not null default 'pending'::text,
  sector_id uuid null,
  created_at timestamp with time zone null default now(),
  started_at timestamp with time zone null,
  ready_at timestamp with time zone null,
  delivered_at timestamp with time zone null,
  constraint order_items_pkey primary key (id),
  constraint order_items_menu_item_id_fkey foreign KEY (menu_item_id) references menu_items (id) on delete RESTRICT,
  constraint order_items_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint order_items_sector_id_fkey foreign KEY (sector_id) references kitchen_sectors (id) on delete set null,
  constraint order_items_quantity_positive check ((quantity > 0)),
  constraint order_items_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'preparing'::text,
          'ready'::text,
          'delivered'::text,
          'cancelled'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_order_items_order on public.order_items using btree (order_id) TABLESPACE pg_default;

create index IF not exists idx_order_items_status on public.order_items using btree (status) TABLESPACE pg_default
where
  (status <> 'delivered'::text);

create index IF not exists idx_order_items_sector on public.order_items using btree (sector_id) TABLESPACE pg_default
where
  (sector_id is not null);

create trigger recalc_order_on_item_change
after INSERT
or DELETE
or
update on order_items for EACH row
execute FUNCTION recalculate_order_totals ();

# Tabla ORDER_PAYMENTS:

create table public.order_payments (
  id uuid not null default gen_random_uuid (),
  order_id uuid not null,
  payer_name text null,
  amount numeric not null,
  payment_method text not null default 'cash'::text,
  status text not null default 'pending'::text,
  created_at timestamp with time zone null default now(),
  paid_at timestamp with time zone null,
  constraint order_payments_pkey primary key (id),
  constraint order_payments_order_id_fkey foreign KEY (order_id) references orders (id) on delete CASCADE,
  constraint order_payments_method_check check (
    (
      payment_method = any (
        array[
          'cash'::text,
          'card'::text,
          'transfer'::text,
          'other'::text
        ]
      )
    )
  ),
  constraint order_payments_status_check check (
    (
      status = any (
        array['pending'::text, 'paid'::text, 'refunded'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_order_payments_order on public.order_payments using btree (order_id) TABLESPACE pg_default;

# Tabla ORDERS:

create table public.orders (
  id uuid not null default gen_random_uuid (),
  restaurant_id uuid not null,
  session_id uuid null,
  customer_id uuid null,
  guest_name text null,
  guest_phone text null,
  order_type text not null default 'dine-in'::text,
  status text not null default 'pending'::text,
  order_number integer not null,
  subtotal numeric not null default 0,
  discount_percent numeric not null default 0,
  discount_amount numeric not null default 0,
  total numeric not null default 0,
  delivery_address text null,
  delivery_lat numeric null,
  delivery_lng numeric null,
  delivery_notes text null,
  notes text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  confirmed_at timestamp with time zone null,
  ready_at timestamp with time zone null,
  delivered_at timestamp with time zone null,
  cancelled_at timestamp with time zone null,
  constraint orders_pkey primary key (id),
  constraint orders_customer_id_fkey foreign KEY (customer_id) references customers (id) on delete set null,
  constraint orders_restaurant_id_fkey foreign KEY (restaurant_id) references restaurants (id) on delete CASCADE,
  constraint orders_session_id_fkey foreign KEY (session_id) references sessions (id) on delete set null,
  constraint orders_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'confirmed'::text,
          'preparing'::text,
          'ready'::text,
          'delivered'::text,
          'cancelled'::text
        ]
      )
    )
  ),
  constraint orders_type_check check (
    (
      order_type = any (
        array['dine-in'::text, 'pickup'::text, 'delivery'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_orders_restaurant on public.orders using btree (restaurant_id) TABLESPACE pg_default;

create index IF not exists idx_orders_session on public.orders using btree (session_id) TABLESPACE pg_default
where
  (session_id is not null);

create index IF not exists idx_orders_status on public.orders using btree (status) TABLESPACE pg_default;

create index IF not exists idx_orders_created on public.orders using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_orders_number on public.orders using btree (restaurant_id, order_number) TABLESPACE pg_default;

create trigger set_order_number BEFORE INSERT on orders for EACH row
execute FUNCTION generate_order_number ();

create trigger update_orders_updated_at BEFORE
update on orders for EACH row
execute FUNCTION update_updated_at_column ();

# Tabla RESTAURANTS:

create table public.restaurants (
  id uuid not null default gen_random_uuid (),
  name text not null,
  slug text not null,
  address text null,
  currency text null default 'USD'::text,
  logo_url text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  owner_id uuid null,
  default_floor_id uuid null,
  default_layout_template_id uuid null,
  is_active boolean not null default true,
  timezone text not null default 'America/Argentina/Buenos_Aires'::text,
  latitude numeric null,
  longitude numeric null,
  google_place_id text null,
  banner_url text null,
  constraint restaurants_pkey primary key (id),
  constraint restaurants_slug_key unique (slug),
  constraint restaurants_default_floor_id_fkey foreign KEY (default_floor_id) references floors (id) on delete set null,
  constraint restaurants_default_layout_template_id_fkey foreign KEY (default_layout_template_id) references layout_templates (id) on delete set null,
  constraint restaurants_owner_id_fkey foreign KEY (owner_id) references auth.users (id)
) TABLESPACE pg_default;

create index IF not exists idx_restaurants_owner on public.restaurants using btree (owner_id) TABLESPACE pg_default
where
  (owner_id is not null);

create trigger update_restaurants_updated_at BEFORE
update on restaurants for EACH row
execute FUNCTION update_updated_at_column ();

# Tabla RESTAURANT_MEMBERS:

create table public.restaurant_members (
  restaurant_id uuid not null,
  user_id uuid not null,
  joined_at timestamp with time zone not null default now(),
  role uuid not null,
  is_active boolean not null default true,
  display_name text null,
  id uuid not null default gen_random_uuid (),
  constraint restaurant_members_pkey primary key (id),
  constraint restaurant_members_restaurant_id_fkey foreign KEY (restaurant_id) references restaurants (id) on delete CASCADE,
  constraint restaurant_members_role_fkey foreign KEY (role) references roles (id) on delete RESTRICT,
  constraint restaurant_members_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_restaurant_members_user on public.restaurant_members using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_restaurant_members_role on public.restaurant_members using btree (role) TABLESPACE pg_default;

create unique INDEX IF not exists uniq_restaurant_member on public.restaurant_members using btree (restaurant_id, user_id) TABLESPACE pg_default;

# Tabla RESTAURANT_SETTINGS:

create table public.restaurant_settings (
  id uuid not null default gen_random_uuid (),
  restaurant_id uuid not null,
  chair_spacing_cm integer not null default 60,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  default_table_size_cm integer not null default 70,
  reservation_interval_minutes integer not null default 30,
  min_reservation_time_hours integer not null default 2,
  max_reservation_time_days integer not null default 30,
  dine_in_discount numeric null default 0,
  dine_in_discount_label text null,
  pickup_discount numeric null default 0,
  pickup_discount_label text null,
  delivery_discount numeric null default 0,
  delivery_discount_label text null,
  constraint restaurant_settings_pkey primary key (id),
  constraint restaurant_settings_restaurant_id_key unique (restaurant_id),
  constraint restaurant_settings_restaurant_id_fkey foreign KEY (restaurant_id) references restaurants (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger update_restaurant_settings_updated_at BEFORE
update on restaurant_settings for EACH row
execute FUNCTION update_updated_at_column ();

# Tabla ROLES:

create table public.roles (
  id uuid not null default gen_random_uuid (),
  code text not null,
  name text not null,
  description text null,
  created_at timestamp with time zone null default now(),
  is_system boolean not null default false,
  position integer not null default 0,
  color text null,
  constraint roles_pkey primary key (id),
  constraint roles_code_key unique (code)
) TABLESPACE pg_default;

# Tabla SESSIONS:

create table public.sessions (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone null default now(),
  restaurant_id uuid not null,
  table_id uuid null,
  customer_id uuid null,
  pax integer not null default 1,
  status text not null default 'open'::text,
  opened_at timestamp with time zone null default now(),
  closed_at timestamp with time zone null,
  constraint sessions_pkey primary key (id),
  constraint sessions_customer_id_fkey foreign KEY (customer_id) references customers (id) on delete set null,
  constraint sessions_restaurant_id_fkey foreign KEY (restaurant_id) references restaurants (id) on delete CASCADE,
  constraint sessions_table_id_fkey foreign KEY (table_id) references tables (id) on delete set null,
  constraint sessions_status_check check (
    (
      status = any (
        array[
          'open'::text,
          'closed'::text,
          'cancelled'::text,
          'pending'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_sessions_restaurant on public.sessions using btree (restaurant_id) TABLESPACE pg_default;

create index IF not exists idx_sessions_table on public.sessions using btree (table_id) TABLESPACE pg_default;

create index IF not exists idx_sessions_status on public.sessions using btree (status) TABLESPACE pg_default
where
  (status = 'open'::text);

create index IF not exists idx_sessions_opened_at on public.sessions using btree (opened_at desc) TABLESPACE pg_default;

# Tabla USERS:

create table public.users (
  id uuid not null,
  email text null,
  full_name text null,
  avatar_url text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  phone text null,
  country text null,
  constraint users_pkey primary key (id),
  constraint users_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger update_users_updated_at BEFORE
update on users for EACH row
execute FUNCTION update_updated_at_column ();

# Tabla TABLES:

create table public.tables (
  id uuid not null default gen_random_uuid (),
  floor_id uuid not null,
  label text not null,
  x numeric not null default 0,
  y numeric not null default 0,
  width numeric not null default 60,
  height numeric not null default 60,
  shape text not null default 'square'::text,
  seats integer not null default 4,
  angle numeric not null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  status text not null default 'available'::text,
  current_pax integer not null default 0,
  opened_at timestamp with time zone null,
  current_session_id uuid null,
  seating jsonb null,
  constraint tables_pkey primary key (id),
  constraint tables_current_session_id_fkey foreign KEY (current_session_id) references sessions (id) on delete set null,
  constraint tables_floor_id_fkey foreign KEY (floor_id) references floors (id) on delete CASCADE,
  constraint tables_shape_check check (
    (
      shape = any (
        array['rectangle'::text, 'circle'::text, 'square'::text]
      )
    )
  ),
  constraint tables_status_check check (
    (
      status = any (
        array[
          'available'::text,
          'occupied'::text,
          'reserved'::text,
          'blocked'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_tables_floor on public.tables using btree (floor_id) TABLESPACE pg_default;

create index IF not exists idx_tables_status on public.tables using btree (status) TABLESPACE pg_default;

create trigger update_tables_updated_at BEFORE
update on tables for EACH row
execute FUNCTION update_updated_at_column ();

