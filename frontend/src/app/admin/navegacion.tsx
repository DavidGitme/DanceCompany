import type { ReactNode } from 'react';

/*
 * Menú del panel ordenado por las tareas más frecuentes.
 * `permiso` coincide con la tabla permisos; `demo` marca las pantallas que
 * todavía usan datos simulados y no guardan en la base de datos.
 */

export interface HijoNavegacion {
  id: string;
  etiqueta: string;
  permiso: string;
  demo?: boolean;
}

export interface NodoNavegacion {
  id: string;
  etiqueta: string;
  icono: ReactNode;
  permiso?: string;
  hijos?: HijoNavegacion[];
}

const icono = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5 flex-shrink-0" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

export const navegacion: NodoNavegacion[] = [
  {
    id: 'dashboard',
    etiqueta: 'Inicio',
    permiso: 'dashboard',
    icono: icono('M2.25 12l8.95-8.95a1.13 1.13 0 011.6 0L21.75 12M4.5 9.75v10.13c0 .62.5 1.12 1.13 1.12H9.75v-4.88c0-.62.5-1.12 1.13-1.12h2.25c.62 0 1.12.5 1.12 1.12V21h4.13c.62 0 1.12-.5 1.12-1.12V9.75M8.25 21h8.25'),
  },
  {
    id: 'personas',
    etiqueta: 'Personas',
    icono: icono('M15 19.13a9.38 9.38 0 002.63.37 9.34 9.34 0 004.12-.95 4.13 4.13 0 00-7.53-2.49M15 19.13v-.01c0-1.11-.29-2.16-.78-3.07M15 19.13v.1A12.32 12.32 0 018.62 21c-2.33 0-4.51-.64-6.37-1.77v-.11a6.38 6.38 0 0111.96-3.07M12 6.38a3.38 3.38 0 11-6.75 0 3.38 3.38 0 016.75 0zm8.25 2.25a2.63 2.63 0 11-5.25 0 2.63 2.63 0 015.25 0z'),
    hijos: [
      { id: 'estudiantes', etiqueta: 'Estudiantes', permiso: 'estudiantes' },
      { id: 'instructores', etiqueta: 'Instructores', permiso: 'instructores' },
    ],
  },
  {
    id: 'clases',
    etiqueta: 'Clases',
    icono: icono('M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5'),
    hijos: [
      { id: 'grupos', etiqueta: 'Grupos', permiso: 'grupos' },
      { id: 'adm-aulas', etiqueta: 'Aulas', permiso: 'aulas' },
      { id: 'adm-agendamientos-instructores', etiqueta: 'Horarios', permiso: 'horarios', demo: true },
    ],
  },
  {
    id: 'matricula-pagos',
    etiqueta: 'Matrícula y pagos',
    icono: icono('M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z'),
    hijos: [
      { id: 'adm-matriculas', etiqueta: 'Matrículas', permiso: 'matriculas', demo: true },
      { id: 'adm-mensualidades', etiqueta: 'Mensualidades', permiso: 'pagos', demo: true },
      { id: 'adm-pagos', etiqueta: 'Pagos', permiso: 'pagos', demo: true },
      { id: 'adm-estado-cuenta', etiqueta: 'Estado de cuenta', permiso: 'pagos', demo: true },
      { id: 'adm-inscripciones-taller', etiqueta: 'Inscripciones', permiso: 'talleres', demo: true },
    ],
  },
  {
    id: 'catalogos',
    etiqueta: 'Catálogos',
    icono: icono('M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z'),
    hijos: [
      { id: 'sedes', etiqueta: 'Sedes', permiso: 'sedes' },
      { id: 'niveles', etiqueta: 'Niveles', permiso: 'niveles' },
      { id: 'estilos', etiqueta: 'Estilos', permiso: 'estilos' },
      { id: 'talleres', etiqueta: 'Talleres', permiso: 'talleres' },
      { id: 'adm-metodos-pago', etiqueta: 'Métodos de pago', permiso: 'pagos' },
    ],
  },
  {
    id: 'comunicacion',
    etiqueta: 'Comunicación',
    icono: icono('M10.34 15.84c-.69-.05-1.38-.08-2.09-.08H7.5a4.5 4.5 0 110-9h.75c.71 0 1.4-.03 2.09-.08m0 9.16c.25.96.59 1.88 1 2.75.26.54.06 1.2-.46 1.5l-.66.38a1.13 1.13 0 01-1.6-.48 17.98 17.98 0 01-1.31-3.76m3.03-.39a48.8 48.8 0 015.24-1.16m-5.24 1.16V6.66m5.24 9.62c.67.11 1.33.24 1.98.38a1.1 1.1 0 001.32-.9 18.12 18.12 0 000-8.52 1.1 1.1 0 00-1.32-.9c-.65.14-1.31.27-1.98.38m0 9.56a17.9 17.9 0 000-9.56m0 0a48.8 48.8 0 00-5.24-1.16'),
    hijos: [
      { id: 'adm-contenidos', etiqueta: 'Noticias', permiso: 'noticias', demo: true },
      { id: 'adm-convocatorias', etiqueta: 'Convocatorias', permiso: 'convocatorias', demo: true },
      { id: 'adm-postulaciones', etiqueta: 'Postulaciones', permiso: 'convocatorias', demo: true },
    ],
  },
  {
    id: 'seguridad',
    etiqueta: 'Seguridad',
    icono: icono('M9 12.75L11.25 15 15 9.75m-3-7.04A11.96 11.96 0 013.6 6 11.99 11.99 0 003 9.75c0 5.59 3.82 10.29 9 11.62 5.18-1.33 9-6.03 9-11.62 0-1.31-.21-2.57-.6-3.75h-.15c-3.2 0-6.1-1.25-8.25-3.29z'),
    hijos: [
      { id: 'seg-usuarios', etiqueta: 'Usuarios', permiso: 'usuarios' },
      { id: 'seg-personas', etiqueta: 'Personas', permiso: 'usuarios', demo: true },
      { id: 'seg-acudientes', etiqueta: 'Acudientes', permiso: 'usuarios', demo: true },
      { id: 'seg-roles-permisos', etiqueta: 'Roles y permisos', permiso: 'roles', demo: true },
      { id: 'seg-estados', etiqueta: 'Estados', permiso: 'roles', demo: true },
    ],
  },
];

// Busca la etiqueta y el grupo de un módulo (para el encabezado móvil)
export function buscarModulo(id: string): { etiqueta: string; demo: boolean } | null {
  for (const nodo of navegacion) {
    if (nodo.id === id) return { etiqueta: nodo.etiqueta, demo: false };
    const hijo = nodo.hijos?.find((h) => h.id === id);
    if (hijo) return { etiqueta: hijo.etiqueta, demo: Boolean(hijo.demo) };
  }
  return null;
}
