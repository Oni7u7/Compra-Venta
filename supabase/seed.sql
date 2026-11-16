-- =====================================================================
-- analisis-compraventa · Datos demo (idempotente: borra y recrea los datos cv_ del usuario demo)
-- Requisito: crear antes el usuario demo@portfolio.dev en Authentication → Users.
-- 15 productos, 4 proveedores con precios distintos y ~6 meses de compras y ventas con estacionalidad.
-- =====================================================================

do $$
declare
  v_user uuid;
  v_start date := current_date - 180;
  v_prod record;
  v_sup record;
  v_day date;
  v_season numeric;
  v_qty numeric;
  v_canal text;
  v_r numeric;
  v_sup_id uuid;
  v_factor numeric;
begin
  select id into v_user from auth.users where email = 'demo@portfolio.dev';
  if v_user is null then
    raise exception 'Primero crea el usuario demo@portfolio.dev en Authentication → Users';
  end if;

  -- Limpieza solo de los datos del usuario demo
  delete from public.cv_sales where user_id = v_user;
  delete from public.cv_purchases where user_id = v_user;
  delete from public.cv_products where user_id = v_user;
  delete from public.cv_suppliers where user_id = v_user;

  perform setseed(0.17);

  insert into public.cv_suppliers (user_id, nombre, ciudad) values
    (v_user, 'Abastos del Centro', 'CDMX'),
    (v_user, 'Distribuidora Norteña', 'Monterrey'),
    (v_user, 'Mayoreo Tapatío', 'Guadalajara'),
    (v_user, 'Comercial del Bajío', 'León');

  -- Datos base temporales: costo de referencia, factor de precio de venta y demanda semanal
  drop table if exists seed_base;
  create temp table seed_base (
    nombre text, categoria text, unidad text, costo numeric, markup numeric, demanda numeric
  ) on commit drop;

  insert into seed_base values
    ('Café de grano 1 kg', 'Café', 'kg', 210, 1.55, 18),
    ('Café molido 500 g', 'Café', 'pza', 95, 1.48, 30),
    ('Leche entera 1 L', 'Lácteos', 'L', 19, 1.30, 160),
    ('Leche de almendra 1 L', 'Lácteos', 'L', 42, 1.45, 35),
    ('Azúcar mascabado 1 kg', 'Abarrotes', 'kg', 34, 1.24, 40),   -- margen bajo
    ('Harina de trigo 1 kg', 'Abarrotes', 'kg', 18, 1.35, 55),
    ('Chocolate en polvo 400 g', 'Abarrotes', 'pza', 58, 1.40, 25),
    ('Galletas artesanales (paq.)', 'Panadería', 'paq', 38, 1.70, 45),
    ('Pan de caja integral', 'Panadería', 'pza', 41, 1.20, 50),    -- margen bajo
    ('Té verde (caja 25)', 'Bebidas', 'caja', 47, 1.60, 20),
    ('Agua mineral 600 ml', 'Bebidas', 'pza', 9, 1.85, 220),
    ('Jugo de naranja 1 L', 'Bebidas', 'L', 24, 1.26, 60),         -- margen bajo
    ('Vasos desechables (50)', 'Desechables', 'paq', 32, 1.50, 28),
    ('Servilletas (500)', 'Desechables', 'paq', 45, 1.38, 22),
    ('Popotes biodegradables (100)', 'Desechables', 'paq', 55, 1.65, 15);

  insert into public.cv_products (user_id, nombre, categoria, unidad)
  select v_user, nombre, categoria, unidad from seed_base;

  for v_prod in
    select p.id, b.costo, b.markup, b.demanda
    from public.cv_products p join seed_base b on b.nombre = p.nombre
    where p.user_id = v_user
  loop
    -- Compras semanales: cada producto se compra a distintos proveedores con precios distintos
    v_day := v_start + floor(random() * 4)::int;
    while v_day <= current_date loop
      v_season := case extract(month from v_day)::int
                    when 12 then 1.35 when 11 then 1.25 when 10 then 1.10
                    when 6 then 0.85 when 7 then 0.88 when 8 then 0.95 else 1.0 end;

      -- Elección de proveedor: no siempre el más barato (así hay "ahorro potencial")
      v_r := random()::numeric;
      select id into v_sup_id from public.cv_suppliers
      where user_id = v_user
      order by nombre
      offset (case when v_r < 0.35 then 0 when v_r < 0.65 then 1 when v_r < 0.85 then 2 else 3 end)
      limit 1;

      -- Cada proveedor tiene un nivel de precio estable por producto (entre -8% y +16%)
      v_factor := 0.92 + (abs(hashtext(v_prod.id::text || v_sup_id::text)) % 25) / 100.0;

      v_qty := greatest(1, round(v_prod.demanda * v_season * (1.15 + random()::numeric * 0.35)));
      insert into public.cv_purchases (user_id, product_id, supplier_id, cantidad, costo_unitario, fecha)
      values (
        v_user, v_prod.id, v_sup_id, v_qty,
        round(v_prod.costo * v_factor * (1 + 0.0004 * (v_day - v_start)) * (0.98 + random()::numeric * 0.04), 2),
        v_day
      );
      v_day := v_day + 7;
    end loop;

    -- Ventas cada 2 días por canal, con estacionalidad mensual y más venta en fin de semana
    v_day := v_start + 1;
    while v_day <= current_date loop
      v_season := case extract(month from v_day)::int
                    when 12 then 1.35 when 11 then 1.25 when 10 then 1.10
                    when 6 then 0.85 when 7 then 0.88 when 8 then 0.95 else 1.0 end
                  * case when extract(isodow from v_day) in (6, 7) then 1.2 else 1.0 end;

      v_r := random()::numeric;
      v_canal := case when v_r < 0.6 then 'tienda' when v_r < 0.85 then 'online' else 'mayoreo' end;
      v_qty := greatest(1, round(v_prod.demanda / 3.5 * v_season * (0.7 + random()::numeric * 0.6)
                                 * case v_canal when 'mayoreo' then 2.5 else 1 end));

      insert into public.cv_sales (user_id, product_id, cantidad, precio_unitario, canal, fecha)
      values (
        v_user, v_prod.id, v_qty,
        round(v_prod.costo * v_prod.markup
              * case v_canal when 'mayoreo' then 0.92 when 'online' then 1.04 else 1 end
              * (1 + 0.0003 * (v_day - v_start)) * (0.98 + random()::numeric * 0.04), 2),
        v_canal, v_day
      );
      v_day := v_day + 2;
    end loop;
  end loop;

  raise notice 'Seed listo: % productos, % proveedores, % compras, % ventas',
    (select count(*) from public.cv_products where user_id = v_user),
    (select count(*) from public.cv_suppliers where user_id = v_user),
    (select count(*) from public.cv_purchases where user_id = v_user),
    (select count(*) from public.cv_sales where user_id = v_user);
end;
$$;
