import type { ReactNode } from "react"
import { AuthProvider } from "@/nucleo/auth/AuthContext"

export default function ProveedorAplicacion({
  children,
}: {
  children: ReactNode
}) {
  return <AuthProvider>{children}</AuthProvider>
}
