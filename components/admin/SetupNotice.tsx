/** Se muestra en /admin cuando faltan las variables de Supabase. */
export function SetupNotice() {
  return (
    <div className="rounded-2xl border border-brand-gold/30 bg-brand-gold/10 p-5 text-sm leading-relaxed text-zinc-300">
      <p className="font-semibold text-brand-gold">Supabase no está configurado</p>
      <p className="mt-2">
        Añade <code className="text-white">NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
        <code className="text-white">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> en <code className="text-white">.env.local</code>{" "}
        y reinicia el servidor. Los pasos completos están en <code className="text-white">SUPABASE.md</code>.
      </p>
    </div>
  );
}
