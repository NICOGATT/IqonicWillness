import { Spinner } from "@/components/ui/fields";

/** Mientras se leen sesión, perfil y métricas (también es el Suspense que pide cacheComponents). */
export default function DashboardLoading() {
  return (
    <p className="flex items-center gap-3 text-sm text-zinc-500">
      <Spinner className="h-5 w-5" /> Cargando tu panel…
    </p>
  );
}
