// Aviso para las pantallas que todavía no están conectadas a la API
export default function AvisoDemo() {
  return (
    <div
      role="note"
      className="flex gap-3 rounded-2xl border border-amber-500/35 bg-amber-500/10 px-5 py-4 font-body text-sm text-amber-800 dark:text-amber-200"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.3 3.38c-.87 1.5.21 3.37 1.95 3.37h14.7c1.73 0 2.81-1.87 1.94-3.37L13.95 3.38c-.87-1.5-3.03-1.5-3.9 0L2.7 16.13zM12 15.75h.01" />
      </svg>
      <p>
        <strong className="font-semibold">Pantalla de demostración.</strong> Muestra datos de ejemplo y todavía no está
        conectada a la base de datos: lo que crees, edites o elimines aquí no se guarda.
      </p>
    </div>
  )
}
