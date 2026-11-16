# analisis-compraventa — Benchmarking de compras y ventas

> Lee también `../CLAUDE.md` (stack, reglas de Supabase compartido, estructura). Prefijo de tablas: **`cv_`**.

## Objetivo
Dashboard analítico: el usuario registra (o importa) compras a proveedores y ventas, y la app calcula
márgenes, rentabilidad por producto y **qué proveedor ofrece mejor precio por el mismo producto**.
Demuestra SQL real (vistas y funciones) y visualización de datos.

## Tablas (todas con `user_id`, RLS: cada usuario solo ve lo suyo)
- `cv_products` (id, user_id, nombre, categoria, unidad)
- `cv_suppliers` (id, user_id, nombre, ciudad)
- `cv_purchases` (id, user_id, product_id, supplier_id, cantidad, costo_unitario, fecha)
- `cv_sales` (id, user_id, product_id, cantidad, precio_unitario, canal: `tienda` | `online` | `mayoreo`, fecha)

## Vistas y funciones SQL (los cálculos van en la BD, no en el frontend)
- `cv_product_margin` (vista): por producto → costo promedio ponderado, precio promedio de venta, margen $ y %, unidades vendidas, utilidad total.
- `cv_supplier_benchmark` (vista): por producto y proveedor → costo promedio, mínimo, máximo, nº de compras, y **ranking** (`rank() over (partition by product_id order by avg_cost)`), más el % de diferencia contra el más barato.
- `cv_monthly_summary(p_from date, p_to date)` (función RPC): compras, ventas y utilidad por mes.
- Las vistas usan `security_invoker = true` para respetar RLS.

## Pantallas (MVP)
1. **Dashboard**: KPIs (ventas, compras, utilidad y margen del periodo), filtro de rango de fechas, y gráficas: línea de ventas vs compras por mes, barras top 10 productos por utilidad, pie de ventas por canal.
2. **Benchmark de proveedores**: elegir producto → tabla comparativa de proveedores con ranking, mejor precio resaltado y "ahorro potencial" si siempre se comprara al más barato.
3. **Márgenes**: tabla ordenable por margen %, con alertas para productos con margen < 15%.
4. **Registros**: CRUD de compras y ventas, más **importar CSV** (con plantilla descargable y vista previa antes de guardar).

## Seed
15 productos, 4 proveedores con precios distintos para los mismos productos, y unos 6 meses de compras y ventas con estacionalidad, para que las gráficas se vean bien.

## Fuera del MVP
Proyecciones, exportar a PDF, alertas por correo.
