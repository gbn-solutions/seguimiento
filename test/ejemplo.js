// Datos inventados para las pruebas. Ningún proyecto real vive en este repo.
export const ejemplo = Object.freeze({
  version: 1,
  proyecto: { nombre: 'Demo', cliente: 'Cliente de prueba', empresa: 'Empresa' },
  precios: { cobroInicial: 100000, mensualidad: 10000, iva: 0.19, horizonteMeses: 12 },
  socios: [
    { nombre: 'Ana', tarifa: 1000 },
    { nombre: 'Beto', tarifa: 2000 },
  ],
  etapas: ['Gestión', 'Diseño', 'Desarrollo', 'Cierre'],
  tareas: [
    { id: 'G00', etapa: 'Gestión', tarea: 'Coordinar', responsable: 'Ana', estado: 'En curso', horasPrevistas: null, cuentaAvance: false, tipoCosto: 'Inicial' },
    { id: 'T01', etapa: 'Diseño', tarea: 'Diseñar', responsable: 'Ana', estado: 'Hecha', horasPrevistas: 10, cuentaAvance: true, tipoCosto: 'Inicial' },
    { id: 'T02', etapa: 'Desarrollo', tarea: 'Construir', responsable: 'Beto', estado: 'Hecha', horasPrevistas: 20, cuentaAvance: true, tipoCosto: 'Inicial' },
    { id: 'T03', etapa: 'Desarrollo', tarea: 'Probar', responsable: '', estado: 'Pendiente', horasPrevistas: 5, cuentaAvance: true, tipoCosto: 'Inicial' },
    { id: 'T04', etapa: 'Cierre', tarea: 'Entregar', responsable: 'Ana', estado: 'Pendiente', horasPrevistas: null, cuentaAvance: true, tipoCosto: 'Inicial' },
    { id: 'M01', etapa: 'Cierre', tarea: 'Soporte', responsable: 'Beto', estado: 'Pendiente', horasPrevistas: 2, cuentaAvance: false, tipoCosto: 'Mensual' },
  ],
  horas: [
    { id: 'h1', fecha: '2026-01-10', tarea: 'T01', socio: 'Ana', calidad: 'Registrada en el momento', horas: 8 },
    { id: 'h2', fecha: '2026-01-11', tarea: 'T02', socio: 'Beto', calidad: 'Estimada retrospectiva', horas: 15 },
    { id: 'h3', fecha: '2026-01-12', tarea: 'T02', socio: 'Ana', calidad: 'Estimada retrospectiva', horas: 2 },
  ],
  gastos: [
    { id: 'G01', concepto: 'Equipo', categoria: 'Equipos', frecuencia: 'Inicial', pagador: 'Empresa', incluir: true, cantidad: 2, unitarioPrevisto: 5000, unitarioReal: 6000 },
    { id: 'G02', concepto: 'Equipo del cliente', categoria: 'Equipos', frecuencia: 'Inicial', pagador: 'Cliente', incluir: true, cantidad: 1, unitarioPrevisto: 99999, unitarioReal: null },
    { id: 'G03', concepto: 'Traslado', categoria: 'Traslados', frecuencia: 'Inicial', pagador: 'Empresa', incluir: true, cantidad: 1, unitarioPrevisto: null, unitarioReal: null },
    { id: 'G04', concepto: 'Hosting', categoria: 'Servicios', frecuencia: 'Mensual', pagador: 'Empresa', incluir: true, cantidad: 1, unitarioPrevisto: 3000, unitarioReal: null },
    { id: 'G05', concepto: 'Opcional', categoria: 'Equipos', frecuencia: 'Inicial', pagador: 'Empresa', incluir: false, cantidad: 1, unitarioPrevisto: 70000, unitarioReal: null },
  ],
})
