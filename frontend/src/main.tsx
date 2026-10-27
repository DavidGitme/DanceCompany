import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/app/App'
import ProveedorAplicacion from '@/app/proveedores/ProveedorAplicacion'
import '@/estilos/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ProveedorAplicacion>
      <App />
    </ProveedorAplicacion>
  </React.StrictMode>,
)
