"use client";

import { TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <TriangleAlertIcon className="size-10 text-destructive" />
      <h2 className="text-lg font-semibold">Algo salió mal</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        {error.message || "No pudimos cargar esta sección. Revisa tu conexión con Supabase."}
      </p>
      <Button onClick={() => retry()}>Reintentar</Button>
    </div>
  );
}
