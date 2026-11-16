-- =====================================================================
-- analisis-compraventa · Esquema inicial (idempotente)
-- Proyecto de Supabase compartido: todo lleva el prefijo cv_
-- Pega este archivo completo en Supabase → SQL Editor y ejecútalo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tablas (todas con user_id: cada usuario solo ve lo suyo)
-- ---------------------------------------------------------------------
create table if not exists public.cv_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null,
  categoria text not null default 'General',
  unidad text not null default 'pza',
  created_at timestamptz not null default now(),
  unique (user_id, nombre)
);

create table if not exists public.cv_suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nombre text not null,
  ciudad text,
  created_at timestamptz not null default now(),
  unique (user_id, nombre)
);

create table if not exists public.cv_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id uuid not null references public.cv_products (id) on delete cascade,
  supplier_id uuid not null references public.cv_suppliers (id) on delete cascade,
  cantidad numeric(12, 2) not null check (cantidad > 0),
  costo_unitario numeric(12, 2) not null check (costo_unitario >= 0),
  fecha date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.cv_sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id uuid not null references public.cv_products (id) on delete cascade,
  cantidad numeric(12, 2) not null check (cantidad > 0),
  precio_unitario numeric(12, 2) not null check (precio_unitario >= 0),
  canal text not null default 'tienda' check (canal in ('tienda', 'online', 'mayoreo')),
  fecha date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists cv_purchases_user_fecha_idx on public.cv_purchases (user_id, fecha);
create index if not exists cv_purchases_product_idx on public.cv_purchases (product_id, supplier_id);
create index if not exists cv_sales_user_fecha_idx on public.cv_sales (user_id, fecha);
create index if not exists cv_sales_product_idx on public.cv_sales (product_id);

-- Integridad: una compra/venta solo puede apuntar a productos/proveedores del mismo usuario.
create or replace function public.cv_check_product_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.cv_products where id = new.product_id and user_id = new.user_id) then
    raise exception 'El producto no pertenece al usuario';
  end if;
  return new;
end;
$$;

create or replace function public.cv_check_supplier_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.cv_suppliers where id = new.supplier_id and user_id = new.user_id) then
    raise exception 'El proveedor no pertenece al usuario';
  end if;
  return new;
end;
$$;

drop trigger if exists cv_purchases_ownership on public.cv_purchases;
create trigger cv_purchases_ownership
  before insert or update on public.cv_purchases
  for each row execute function public.cv_check_product_owner();

drop trigger if exists cv_purchases_supplier_ownership on public.cv_purchases;
create trigger cv_purchases_supplier_ownership
  before insert or update on public.cv_purchases
  for each row execute function public.cv_check_supplier_owner();

drop trigger if exists cv_sales_ownership on public.cv_sales;
create trigger cv_sales_ownership
  before insert or update on public.cv_sales
  for each row execute function public.cv_check_product_owner();

-- ---------------------------------------------------------------------
-- RLS: cada usuario solo lee y escribe sus propias filas
-- ---------------------------------------------------------------------
alter table public.cv_products enable row level security;
alter table public.cv_suppliers enable row level security;
alter table public.cv_purchases enable row level security;
alter table public.cv_sales enable row level security;

drop policy if exists cv_products_own on public.cv_products;
create policy cv_products_own on public.cv_products
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists cv_suppliers_own on public.cv_suppliers;
create policy cv_suppliers_own on public.cv_suppliers
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists cv_purchases_own on public.cv_purchases;
create policy cv_purchases_own on public.cv_purchases
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists cv_sales_own on public.cv_sales;
create policy cv_sales_own on public.cv_sales
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- Vista: costo promedio ponderado por producto (base para márgenes y utilidad)
-- ---------------------------------------------------------------------
create or replace view public.cv_product_cost
with (security_invoker = true) as
select
  p.id as product_id,
  p.user_id,
  sum(pu.cantidad * pu.costo_unitario) / nullif(sum(pu.cantidad), 0) as costo_promedio
from public.cv_products p
left join public.cv_purchases pu on pu.product_id = p.id
group by p.id, p.user_id;

-- ---------------------------------------------------------------------
-- Vista: margen y rentabilidad por producto
-- ---------------------------------------------------------------------
create or replace view public.cv_product_margin
with (security_invoker = true) as
with ventas as (
  select
    product_id,
    sum(cantidad) as unidades,
    sum(cantidad * precio_unitario) as ingreso
  from public.cv_sales
  group by product_id
)
select
  p.id as product_id,
  p.user_id,
  p.nombre,
  p.categoria,
  p.unidad,
  round(c.costo_promedio, 2) as costo_promedio,
  round(v.ingreso / nullif(v.unidades, 0), 2) as precio_promedio,
  round(v.ingreso / nullif(v.unidades, 0) - c.costo_promedio, 2) as margen,
  round((v.ingreso / nullif(v.unidades, 0) - c.costo_promedio) / nullif(v.ingreso / nullif(v.unidades, 0), 0) * 100, 2) as margen_pct,
  coalesce(v.unidades, 0) as unidades_vendidas,
  coalesce(round(v.ingreso, 2), 0) as ingreso_total,
  round(coalesce(v.ingreso, 0) - coalesce(v.unidades, 0) * c.costo_promedio, 2) as utilidad_total
from public.cv_products p
join public.cv_product_cost c on c.product_id = p.id
left join ventas v on v.product_id = p.id;

-- ---------------------------------------------------------------------
-- Vista: benchmark de proveedores por producto
-- ---------------------------------------------------------------------
create or replace view public.cv_supplier_benchmark
with (security_invoker = true) as
with base as (
  select
    pu.product_id,
    pu.supplier_id,
    pu.user_id,
    sum(pu.cantidad * pu.costo_unitario) / sum(pu.cantidad) as avg_cost,
    min(pu.costo_unitario) as min_cost,
    max(pu.costo_unitario) as max_cost,
    count(*) as num_compras,
    sum(pu.cantidad) as unidades,
    sum(pu.cantidad * pu.costo_unitario) as gasto,
    max(pu.fecha) as ultima_compra
  from public.cv_purchases pu
  group by pu.product_id, pu.supplier_id, pu.user_id
)
select
  b.product_id,
  p.nombre as producto,
  p.unidad,
  b.supplier_id,
  s.nombre as proveedor,
  s.ciudad,
  b.user_id,
  round(b.avg_cost, 2) as avg_cost,
  b.min_cost,
  b.max_cost,
  b.num_compras,
  b.unidades,
  round(b.gasto, 2) as gasto,
  b.ultima_compra,
  rank() over (partition by b.product_id order by b.avg_cost) as ranking,
  round((b.avg_cost - min(b.avg_cost) over (partition by b.product_id))
        / nullif(min(b.avg_cost) over (partition by b.product_id), 0) * 100, 2) as pct_vs_mejor,
  -- Cuánto se habría ahorrado si estas unidades se hubieran comprado al proveedor más barato
  round(b.unidades * (b.avg_cost - min(b.avg_cost) over (partition by b.product_id)), 2) as ahorro_potencial
from base b
join public.cv_products p on p.id = b.product_id
join public.cv_suppliers s on s.id = b.supplier_id;

-- ---------------------------------------------------------------------
-- RPC: resumen mensual (compras, ventas, costo de lo vendido y utilidad)
-- ---------------------------------------------------------------------
create or replace function public.cv_monthly_summary(p_from date, p_to date)
returns table (mes date, compras numeric, ventas numeric, costo_ventas numeric, utilidad numeric)
language sql
stable
security invoker
set search_path = public
as $$
  with meses as (
    select generate_series(date_trunc('month', p_from), date_trunc('month', p_to), interval '1 month')::date as mes
  ),
  c as (
    select date_trunc('month', fecha)::date as mes, sum(cantidad * costo_unitario) as total
    from public.cv_purchases
    where fecha between p_from and p_to
    group by 1
  ),
  v as (
    select date_trunc('month', s.fecha)::date as mes,
           sum(s.cantidad * s.precio_unitario) as total,
           sum(s.cantidad * coalesce(pc.costo_promedio, 0)) as costo
    from public.cv_sales s
    left join public.cv_product_cost pc on pc.product_id = s.product_id
    where s.fecha between p_from and p_to
    group by 1
  )
  select
    m.mes,
    round(coalesce(c.total, 0), 2) as compras,
    round(coalesce(v.total, 0), 2) as ventas,
    round(coalesce(v.costo, 0), 2) as costo_ventas,
    round(coalesce(v.total, 0) - coalesce(v.costo, 0), 2) as utilidad
  from meses m
  left join c on c.mes = m.mes
  left join v on v.mes = m.mes
  order by m.mes;
$$;

-- ---------------------------------------------------------------------
-- RPC: datos del dashboard para un periodo (KPIs, top productos, canales)
-- ---------------------------------------------------------------------
create or replace function public.cv_dashboard(p_from date, p_to date)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with v as (
    select s.*, s.cantidad * s.precio_unitario as ingreso,
           s.cantidad * coalesce(pc.costo_promedio, 0) as costo
    from public.cv_sales s
    left join public.cv_product_cost pc on pc.product_id = s.product_id
    where s.fecha between p_from and p_to
  ),
  totals as (
    select
      coalesce(sum(ingreso), 0) as ventas,
      coalesce(sum(costo), 0) as costo_ventas,
      count(*) as num_ventas
    from v
  ),
  compras as (
    select coalesce(sum(cantidad * costo_unitario), 0) as compras, count(*) as num_compras
    from public.cv_purchases
    where fecha between p_from and p_to
  )
  select json_build_object(
    'ventas', round(t.ventas, 2),
    'compras', round(c.compras, 2),
    'costo_ventas', round(t.costo_ventas, 2),
    'utilidad', round(t.ventas - t.costo_ventas, 2),
    'margen_pct', round((t.ventas - t.costo_ventas) / nullif(t.ventas, 0) * 100, 2),
    'num_ventas', t.num_ventas,
    'num_compras', c.num_compras,
    'top_productos', (
      select coalesce(json_agg(x order by x.utilidad desc), '[]'::json)
      from (
        select p.nombre, round(sum(v.ingreso - v.costo), 2) as utilidad, round(sum(v.ingreso), 2) as ventas
        from v join public.cv_products p on p.id = v.product_id
        group by p.nombre
        order by utilidad desc
        limit 10
      ) x
    ),
    'por_canal', (
      select coalesce(json_agg(x order by x.ventas desc), '[]'::json)
      from (
        select canal, round(sum(ingreso), 2) as ventas, count(*) as num
        from v group by canal
      ) x
    )
  )
  from totals t, compras c;
$$;

revoke all on public.cv_product_cost, public.cv_product_margin, public.cv_supplier_benchmark from anon;
grant select on public.cv_product_cost, public.cv_product_margin, public.cv_supplier_benchmark to authenticated;

revoke all on function public.cv_monthly_summary(date, date) from public, anon;
revoke all on function public.cv_dashboard(date, date) from public, anon;
grant execute on function public.cv_monthly_summary(date, date) to authenticated;
grant execute on function public.cv_dashboard(date, date) to authenticated;
