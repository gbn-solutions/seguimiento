// Qué se pregunta en cada formulario y qué muestra cada tabla.
// Las tres secciones (tareas, horas, gastos) se describen acá y se dibujan con el mismo código.

import { fecha, hoy, moneda, numero } from './dom.js'
import { filasDeGastos, filasDeHoras, filasDeTareas } from './calculo.js'
import { CALIDADES, CATEGORIAS, ESTADOS, PAGADORES, PROPIETARIOS, TIPOS_DE_COSTO, idAleatorio, siguienteId } from './modelo.js'

const empresaDe = (datos) => datos.proyecto.empresa || 'Empresa'
const conEmpresa = (valores) => (datos) =>
  valores.map((valor) => ({ valor, etiqueta: valor === 'Empresa' ? empresaDe(datos) : valor }))
const simples = (valores) => () => valores.map((valor) => ({ valor, etiqueta: valor }))
const socios = (datos) => datos.socios.map((s) => ({ valor: s.nombre, etiqueta: s.nombre }))
const mostrarPagador = (datos, valor) => (valor === 'Empresa' ? empresaDe(datos) : valor || '')
const siNo = (v) => (v ? 'Sí' : 'No')

export const SECCIONES = {
  tareas: {
    titulo: 'Tareas',
    singular: 'tarea',
    filas: filasDeTareas,
    nuevo: (datos) => ({
      id: siguienteId(datos.tareas, 'T'),
      etapa: datos.etapas[0] ?? '',
      estado: 'Pendiente',
      cuentaAvance: true,
      tipoCosto: 'Inicial',
    }),
    campos: [
      { clave: 'id', etiqueta: 'ID', tipo: 'texto', requerido: true },
      { clave: 'etapa', etiqueta: 'Etapa', tipo: 'opcion', opciones: (d) => d.etapas.map((e) => ({ valor: e, etiqueta: e })), requerido: true },
      { clave: 'tarea', etiqueta: 'Tarea', tipo: 'texto', requerido: true, ancho: true },
      { clave: 'responsable', etiqueta: 'Responsable', tipo: 'opcion', opciones: socios, vacio: 'Sin asignar' },
      { clave: 'estado', etiqueta: 'Estado', tipo: 'opcion', opciones: simples(ESTADOS), requerido: true },
      { clave: 'fechaObjetivo', etiqueta: 'Fecha objetivo', tipo: 'fecha' },
      { clave: 'horasPrevistas', etiqueta: 'Horas previstas', tipo: 'numero' },
      { clave: 'entregable', etiqueta: 'Entregable', tipo: 'texto', ancho: true },
      { clave: 'proximaAccion', etiqueta: 'Próxima acción', tipo: 'texto', ancho: true },
      { clave: 'bloqueo', etiqueta: 'Bloqueo', tipo: 'texto', ancho: true },
      { clave: 'tipoCosto', etiqueta: 'Tipo de costo', tipo: 'opcion', opciones: simples(TIPOS_DE_COSTO), requerido: true },
      { clave: 'cuentaAvance', etiqueta: 'Cuenta para el avance', tipo: 'si-no' },
    ],
    columnas: [
      { titulo: 'ID', valor: (f) => f.id },
      { titulo: 'Etapa', valor: (f) => f.etapa },
      { titulo: 'Tarea', valor: (f) => f.tarea, ancha: true },
      { titulo: 'Responsable', valor: (f) => f.responsable },
      { titulo: 'Estado', valor: (f) => f.estado, marca: (f) => f.estado },
      { titulo: 'Fecha objetivo', valor: (f) => (f.fechaObjetivo ? fecha(f.fechaObjetivo) : '') },
      { titulo: 'Próxima acción', valor: (f) => f.proximaAccion, ancha: true },
      { titulo: 'Bloqueo', valor: (f) => f.bloqueo },
      { titulo: 'H. previstas', valor: (f) => numero(f.horasPrevistas), numerica: true },
      { titulo: 'Costo previsto', valor: (f) => moneda(f.costoPrevisto), numerica: true },
      { titulo: 'H. registradas', valor: (f) => numero(f.horasRegistradas), numerica: true },
      { titulo: 'Costo registrado', valor: (f) => moneda(f.costoRegistrado), numerica: true },
      { titulo: 'Dato de costo', valor: (f) => f.datoDeCosto, marca: (f) => f.datoDeCosto },
    ],
  },

  horas: {
    titulo: 'Horas',
    singular: 'registro de horas',
    filas: (datos) => [...filasDeHoras(datos)].sort((a, b) => (b.fecha ?? '').localeCompare(a.fecha ?? '')),
    nuevo: () => ({ id: idAleatorio(), fecha: hoy(), calidad: CALIDADES[0] }),
    idOculto: true,
    campos: [
      { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', requerido: true },
      { clave: 'tarea', etiqueta: 'Tarea', tipo: 'opcion', opciones: (d) => d.tareas.map((t) => ({ valor: t.id, etiqueta: `${t.id} · ${t.tarea}` })), requerido: true, ancho: true },
      { clave: 'socio', etiqueta: 'Socio', tipo: 'opcion', opciones: socios, requerido: true },
      { clave: 'horas', etiqueta: 'Horas', tipo: 'numero', requerido: true, minimo: 0.1 },
      { clave: 'calidad', etiqueta: 'Calidad del dato', tipo: 'opcion', opciones: simples(CALIDADES), requerido: true },
      { clave: 'nota', etiqueta: 'Nota', tipo: 'texto', ancho: true },
    ],
    columnas: [
      { titulo: 'Fecha', valor: (f) => fecha(f.fecha) },
      { titulo: 'Tarea', valor: (f, d) => { const t = d.tareas.find((x) => x.id === f.tarea); return t ? `${t.id} · ${t.tarea}` : f.tarea }, ancha: true },
      { titulo: 'Socio', valor: (f) => f.socio },
      { titulo: 'Calidad', valor: (f) => f.calidad },
      { titulo: 'Horas', valor: (f) => numero(f.horas), numerica: true },
      { titulo: 'Costo', valor: (f) => moneda(f.costo), numerica: true },
      { titulo: 'Nota', valor: (f) => f.nota, ancha: true },
      { titulo: 'Validación', valor: (f) => f.validacion, marca: (f) => f.validacion },
    ],
  },

  gastos: {
    titulo: 'Gastos',
    singular: 'gasto',
    filas: filasDeGastos,
    nuevo: (datos) => ({
      id: siguienteId(datos.gastos, 'G'),
      categoria: CATEGORIAS[0],
      frecuencia: 'Inicial',
      pagador: 'Empresa',
      incluir: true,
      cantidad: 1,
      propietario: 'Por definir',
    }),
    campos: [
      { clave: 'id', etiqueta: 'ID', tipo: 'texto', requerido: true },
      { clave: 'concepto', etiqueta: 'Concepto', tipo: 'texto', requerido: true, ancho: true },
      { clave: 'categoria', etiqueta: 'Categoría', tipo: 'opcion', opciones: simples(CATEGORIAS), requerido: true },
      { clave: 'frecuencia', etiqueta: 'Frecuencia', tipo: 'opcion', opciones: simples(TIPOS_DE_COSTO), requerido: true },
      { clave: 'pagador', etiqueta: 'Pagador', tipo: 'opcion', opciones: conEmpresa(PAGADORES), requerido: true },
      { clave: 'incluir', etiqueta: 'Incluir en el plan', tipo: 'si-no' },
      { clave: 'cantidad', etiqueta: 'Cantidad', tipo: 'numero' },
      { clave: 'unitarioPrevisto', etiqueta: 'Unitario previsto (neto)', tipo: 'numero' },
      { clave: 'unitarioReal', etiqueta: 'Unitario real (neto)', tipo: 'numero' },
      { clave: 'propietario', etiqueta: 'Propietario', tipo: 'opcion', opciones: conEmpresa(PROPIETARIOS) },
      { clave: 'observacion', etiqueta: 'Observación', tipo: 'area', ancho: true },
    ],
    columnas: [
      { titulo: 'ID', valor: (f) => f.id },
      { titulo: 'Concepto', valor: (f) => f.concepto, ancha: true },
      { titulo: 'Categoría', valor: (f) => f.categoria },
      { titulo: 'Frecuencia', valor: (f) => f.frecuencia },
      { titulo: 'Pagador', valor: (f, d) => mostrarPagador(d, f.pagador) },
      { titulo: 'En el plan', valor: (f) => siNo(f.incluir) },
      { titulo: 'Cantidad', valor: (f) => numero(f.cantidad), numerica: true },
      { titulo: 'Unit. previsto', valor: (f) => moneda(f.unitarioPrevisto), numerica: true },
      { titulo: 'Costo previsto', valor: (f) => moneda(f.costoPrevisto), numerica: true },
      { titulo: 'Unit. real', valor: (f) => moneda(f.unitarioReal), numerica: true },
      { titulo: 'Costo registrado', valor: (f) => moneda(f.costoRegistrado), numerica: true },
      { titulo: 'Dato de costo', valor: (f) => f.datoDeCosto, marca: (f) => f.datoDeCosto },
      { titulo: 'Observación', valor: (f) => f.observacion, ancha: true },
    ],
  },
}
