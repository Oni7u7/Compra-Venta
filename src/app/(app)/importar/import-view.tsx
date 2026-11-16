"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Papa from "papaparse";
import {
  CheckCircle2Icon,
  DownloadIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  UploadIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { normalizeHeader, TEMPLATES, templateCsv, validateRows, type CsvKind } from "@/lib/csv";
import { formatDate, formatMXN, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { importRows } from "./actions";

const MAX_BYTES = 2 * 1024 * 1024;
const PREVIEW_LIMIT = 100;

type Result = ReturnType<typeof validateRows>;

export function ImportView({ existingProducts, existingSuppliers }: { existingProducts: string[]; existingSuppliers: string[] }) {
  const [kind, setKind] = useState<CsvKind>("compras");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Result>([]);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const productSet = useMemo(() => new Set(existingProducts.map((p) => p.toLowerCase())), [existingProducts]);
  const supplierSet = useMemo(() => new Set(existingSuppliers.map((s) => s.toLowerCase())), [existingSuppliers]);

  const valid = rows.filter((r) => r.ok);
  const invalid = rows.filter((r) => !r.ok);
  const newProducts = new Set(valid.map((r) => r.ok && r.data.producto.trim()).filter((p): p is string => Boolean(p) && !productSet.has((p as string).toLowerCase())));
  const newSuppliers = new Set(
    valid
      .map((r) => r.ok && "proveedor" in r.data && r.data.proveedor.trim())
      .filter((s): s is string => Boolean(s) && !supplierSet.has((s as string).toLowerCase())),
  );
  const total = valid.reduce((acc, r) => {
    if (!r.ok) return acc;
    const unit = "costo_unitario" in r.data ? r.data.costo_unitario : r.data.precio_unitario;
    return acc + r.data.cantidad * unit;
  }, 0);

  function reset() {
    setRows([]);
    setFileName(null);
    setDone(null);
  }

  function downloadTemplate() {
    const blob = new Blob(["﻿" + templateCsv(kind)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `plantilla-${kind}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name)) return toast.error("El archivo debe ser .csv");
    if (file.size > MAX_BYTES) return toast.error("El archivo pesa más de 2 MB");
    setDone(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (res) => {
        if (res.data.length === 0) {
          toast.error("El archivo no tiene filas");
          return;
        }
        const headers = (res.meta.fields ?? []).map((h) => h.trim().toLowerCase());
        const required = TEMPLATES[kind].headers;
        const missing = required.filter((h) => !headers.some((x) => x.replace(/\s+/g, "_").normalize("NFD").replace(/[̀-ͯ]/g, "") === h));
        if (missing.length > 0) {
          toast.error(`Faltan columnas: ${missing.join(", ")}. Descarga la plantilla de ${kind}.`);
        }
        setFileName(file.name);
        setRows(validateRows(kind, res.data));
      },
      error: (err) => toast.error(`No se pudo leer el CSV: ${err.message}`),
    });
  }

  function save() {
    startTransition(async () => {
      const res = await importRows(
        kind,
        valid.map((r) => (r.ok ? r.data : null)),
      );
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const extra = [
        res.data?.newProducts ? `${res.data.newProducts} productos nuevos` : "",
        res.data?.newSuppliers ? `${res.data.newSuppliers} proveedores nuevos` : "",
      ]
        .filter(Boolean)
        .join(" y ");
      toast.success(res.message);
      setDone(`${res.message}${extra ? `, con ${extra}` : ""}.`);
      setRows([]);
      setFileName(null);
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>1. Elige qué vas a importar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de registros">
            {(["compras", "ventas"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => {
                  setKind(k);
                  reset();
                }}
                className={cn(
                  "rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors",
                  kind === k ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                )}
              >
                {k}
              </button>
            ))}
          </div>
          <div className="space-y-2 text-sm">
            <p className="font-medium">Columnas</p>
            <div className="flex flex-wrap gap-1">
              {TEMPLATES[kind].headers.map((h) => (
                <code key={h} className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {h}
                </code>
              ))}
            </div>
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              <li>Fecha como AAAA-MM-DD o DD/MM/AAAA.</li>
              <li>Productos y proveedores se buscan por nombre; si no existen se crean.</li>
              {kind === "ventas" && <li>Canal: tienda, online o mayoreo.</li>}
              <li>Máximo 2,000 filas por archivo.</li>
            </ul>
          </div>
          <Button variant="outline" className="w-full" onClick={downloadTemplate}>
            <DownloadIcon /> Descargar plantilla
          </Button>
        </CardContent>
      </Card>

      <div className="min-w-0 space-y-4">
        {done && (
          <div className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm">
            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            <div className="flex-1">
              <p>{done}</p>
              <div className="mt-2 flex gap-3">
                <Link href={`/registros?tab=${kind}`} className="font-medium underline underline-offset-2">
                  Ver registros
                </Link>
                <Link href="/" className="font-medium underline underline-offset-2">
                  Ir al dashboard
                </Link>
              </div>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-16 text-center transition-colors",
              dragging ? "border-primary bg-primary/5" : "hover:border-primary/50 hover:bg-muted/50",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                handleFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
              <UploadIcon className="size-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">2. Arrastra tu CSV de {kind} aquí</p>
              <p className="text-sm text-muted-foreground">o haz clic para elegir un archivo (máx. 2 MB)</p>
            </div>
          </label>
        ) : (
          <Card className="gap-0 py-0">
            <CardHeader className="flex flex-col gap-3 border-b py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheetIcon className="size-4" /> 3. Vista previa
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2">
                  <span className="truncate">{fileName}</span>
                  <Badge variant="secondary">{rows.length} filas</Badge>
                  <Badge className="bg-emerald-600 text-white">{valid.length} válidas</Badge>
                  {invalid.length > 0 && <Badge variant="destructive">{invalid.length} con error</Badge>}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={reset} disabled={pending}>
                  <XIcon /> Cancelar
                </Button>
                <Button onClick={save} disabled={pending || valid.length === 0}>
                  {pending ? <Loader2Icon className="animate-spin" /> : <UploadIcon />} Importar {valid.length}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-0">
              <div className="flex flex-wrap gap-x-6 gap-y-1 px-4 pt-3 text-sm">
                <span>
                  Importe: <strong className="tabular-nums">{formatMXN(total)}</strong>
                </span>
                {newProducts.size > 0 && (
                  <span className="text-muted-foreground">
                    Se crearán <strong className="text-foreground">{newProducts.size}</strong> productos
                  </span>
                )}
                {newSuppliers.size > 0 && (
                  <span className="text-muted-foreground">
                    y <strong className="text-foreground">{newSuppliers.size}</strong> proveedores
                  </span>
                )}
                {invalid.length > 0 && <span className="text-destructive">Las filas con error no se importan.</span>}
              </div>
              <div className="max-h-[28rem] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-card">
                    <TableRow>
                      <TableHead className="w-14 pl-4">Línea</TableHead>
                      <TableHead className="w-10" />
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      {kind === "compras" ? <TableHead>Proveedor</TableHead> : <TableHead>Canal</TableHead>}
                      <TableHead className="text-right">Cant.</TableHead>
                      <TableHead className="pr-4 text-right">{kind === "compras" ? "Costo" : "Precio"}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...invalid, ...valid].slice(0, PREVIEW_LIMIT).map((r) =>
                      r.ok ? (
                        <TableRow key={r.line}>
                          <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">{r.line}</TableCell>
                          <TableCell>
                            <CheckCircle2Icon className="size-4 text-emerald-600" aria-label="Válida" />
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{formatDate(r.data.fecha)}</TableCell>
                          <TableCell>
                            {r.data.producto}
                            {newProducts.has(r.data.producto.trim()) && (
                              <Badge variant="outline" className="ml-2">
                                nuevo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {"proveedor" in r.data ? (
                              <>
                                {r.data.proveedor}
                                {newSuppliers.has(r.data.proveedor.trim()) && (
                                  <Badge variant="outline" className="ml-2">
                                    nuevo
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <span className="capitalize">{r.data.canal}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatNumber(r.data.cantidad)}</TableCell>
                          <TableCell className="pr-4 text-right tabular-nums">
                            {formatMXN("costo_unitario" in r.data ? r.data.costo_unitario : r.data.precio_unitario)}
                          </TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={r.line} className="bg-destructive/5">
                          <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">{r.line}</TableCell>
                          <TableCell>
                            <XCircleIcon className="size-4 text-destructive" aria-label="Con error" />
                          </TableCell>
                          <TableCell colSpan={5} className="pr-4 text-sm text-destructive">
                            {r.error}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </div>
              {rows.length > PREVIEW_LIMIT && (
                <p className="px-4 pb-3 text-xs text-muted-foreground">
                  Mostrando {PREVIEW_LIMIT} de {rows.length} filas (primero las que tienen error).
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
