import type { ReactNode } from "react"
import { AuthProvider } from "@/nucleo/auth/AuthContext"
import { IdiomaProvider } from "@/nucleo/i18n/IdiomaContext"

export default function ProveedorAplicacion({
  children,
}: {
  children: ReactNode
}) {
  return (
    <IdiomaProvider>
      <AuthProvider>{children}</AuthProvider>
    </IdiomaProvider>
  )
}
