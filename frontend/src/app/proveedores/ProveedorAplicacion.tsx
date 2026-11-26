import type { ReactNode } from "react"
import { AuthProvider } from "@/nucleo/auth/AuthContext"
import { IdiomaProvider } from "@/nucleo/i18n/IdiomaContext"
import { TemaProvider } from "@/nucleo/tema/TemaContext"

export default function ProveedorAplicacion({
  children,
}: {
  children: ReactNode
}) {
  return (
    <IdiomaProvider>
      <TemaProvider>
        <AuthProvider>{children}</AuthProvider>
      </TemaProvider>
    </IdiomaProvider>
  )
}
