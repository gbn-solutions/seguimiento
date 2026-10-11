// La forma de un proyecto y las únicas operaciones que lo cambian.
// Cada operación devuelve un proyecto nuevo; el que recibe queda intacto.

export const VERSION = 1
export const ESTADOS = ['Pendiente', 'En curso', 'Hecha', 'Bloqueada']
export const TIPOS_DE_COSTO = ['Inicial', 'Mensual']
export const CALIDADES = ['Registrada en el momento', 'Estimada retrospectiva']
export const CATEGORIAS = ['Equipos', 'Materiales', 'Traslados', 'Servicios', 'Otros']
export const PAGADORES = ['Empresa', 'Cliente']
export const PROPIETARIOS = ['Empresa', 'Cliente', 'No aplica', 'Por definir']
const ETAPAS = ['Gestión transversal', 'Alcance', 'Levantamiento', 'Diseño', 'Desarrollo', 'Instalación', 'Piloto y pruebas', 'Implementación', 'Estabilización y cierre']
const COLECCIONES = ['tareas', 'horas', 'gastos']

export class ErrorDeDatos extends Error {}

export function proyectoVacio(nombre) {
  return {
    version: VERSION,
    proyecto: { nombre, cliente: '', empresa: 'Empresa' },
    precios: { cobroInicial: 0, mensualidad: 0, iva: 0.19, horizonteMeses: 12 },
    socios: [],
    etapas: [...ETAPAS],
    tareas: [],
    horas: [],
    gastos: [],
  }
}

// Lo que llega del repo es dato externo: se comprueba antes de calcular con él.
export function validarProyecto(datos) {
  if (datos === null || typeof datos !== 'object' || Array.isArray(datos)) {
    throw new ErrorDeDatos('El archivo no contiene un proyecto.')
  }
  if (datos.version !== VERSION) {
    throw new ErrorDeDatos(`Versión de archivo no soportada: ${String(datos.version)}.`)
  }
  for (const clave of ['socios', 'etapas', ...COLECCIONES]) {
    if (!Array.isArray(datos[clave])) throw new ErrorDeDatos(`Al archivo le falta la lista «${clave}».`)
  }
  for (const clave of ['proyecto', 'precios']) {
    if (datos[clave] === null || typeof datos[clave] !== 'object') {
      throw new ErrorDeDatos(`Al archivo le falta la sección «${clave}».`)
    }
  }
  for (const clave of ['socios', ...COLECCIONES]) {
    if (datos[clave].some((r) => r === null || typeof r !== 'object' || Array.isArray(r))) {
      throw new ErrorDeDatos(`La lista «${clave}» tiene un elemento que no es un registro.`)
    }
  }
  for (const clave of ['cobroInicial', 'mensualidad', 'iva', 'horizonteMeses']) {
    if (typeof datos.precios[clave] !== 'number' || !Number.isFinite(datos.precios[clave])) {
      throw new ErrorDeDatos(`El precio «${clave}» tiene que ser un número.`)
    }
  }
  return datos
}

const CONFLICTO = 'Otro socio cambió esto mientras lo editabas. Cierra, revisa su cambio y vuelve a hacer el tuyo.'
const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b)

export const serializar = (datos) => `${JSON.stringify(datos, null, 2)}\n`

export function nombreDeArchivo(nombre) {
  const limpio = nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!limpio) throw new ErrorDeDatos('El nombre del proyecto necesita al menos una letra o un número.')
  return limpio
}

// T01, T02… → T03. Respeta el prefijo y el ancho que ya usa la colección.
export function siguienteId(registros, prefijo) {
  const numeros = registros
    .map((r) => new RegExp(`^${prefijo}(\\d+)`).exec(r.id ?? ''))
    .filter(Boolean)
    .map((m) => Number(m[1]))
  const siguiente = numeros.length ? Math.max(...numeros) + 1 : 1
  return `${prefijo}${String(siguiente).padStart(2, '0')}`
}

export const idAleatorio = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

function exigirColeccion(coleccion) {
  if (!COLECCIONES.includes(coleccion)) throw new ErrorDeDatos(`Colección desconocida: ${coleccion}.`)
}

// Crea el registro, o reemplaza a `original` (el registro tal como estaba cuando se
// abrió para editar). Si entre tanto otro socio lo cambió o lo borró, se rechaza en
// vez de pisar su cambio. Si una tarea cambia de ID, sus horas la siguen.
export function guardarRegistro(datos, coleccion, registro, original = null) {
  exigirColeccion(coleccion)
  if (!registro.id) throw new ErrorDeDatos('El registro necesita un ID.')
  const actuales = datos[coleccion]
  const idOriginal = original?.id ?? null
  if (original !== null && !iguales(actuales.find((r) => r.id === idOriginal), original)) {
    throw new ErrorDeDatos(CONFLICTO)
  }
  if (actuales.some((r) => r.id === registro.id && r.id !== idOriginal)) {
    throw new ErrorDeDatos(`Ya existe un registro con el ID ${registro.id}.`)
  }
  const existe = original !== null
  const nuevos = existe ? actuales.map((r) => (r.id === idOriginal ? registro : r)) : [...actuales, registro]
  const cambioDeId = coleccion === 'tareas' && existe && idOriginal !== registro.id
  return {
    ...datos,
    [coleccion]: nuevos,
    horas: (coleccion === 'horas' ? nuevos : datos.horas).map((h) =>
      cambioDeId && h.tarea === idOriginal ? { ...h, tarea: registro.id } : h,
    ),
  }
}

export function quitarRegistro(datos, coleccion, id) {
  exigirColeccion(coleccion)
  if (coleccion === 'tareas' && datos.horas.some((h) => h.tarea === id)) {
    throw new ErrorDeDatos(`La tarea ${id} tiene horas registradas. Bórralas o muévelas antes de quitarla.`)
  }
  return { ...datos, [coleccion]: datos[coleccion].filter((r) => r.id !== id) }
}

export const ajustesDe = (datos) => ({ proyecto: datos.proyecto, precios: datos.precios, socios: datos.socios, etapas: datos.etapas })

// `socios` trae, por cada uno, el nombre que tenía antes (`original`) para que
// las tareas y las horas sigan al socio cuando se le cambia el nombre.
// `vistos` son los ajustes tal como estaban al abrir el formulario: si ya no
// coinciden con los guardados, otro socio los cambió y no se pisan.
export function guardarAjustes(datos, { proyecto, precios, socios, etapas }, vistos = null) {
  if (vistos !== null && !iguales(ajustesDe(datos), vistos)) throw new ErrorDeDatos(CONFLICTO)
  const nombres = socios.map((s) => s.nombre)
  if (nombres.some((n) => !n)) throw new ErrorDeDatos('Cada socio necesita un nombre.')
  if (new Set(nombres).size !== nombres.length) throw new ErrorDeDatos('Hay dos socios con el mismo nombre.')
  const renombres = new Map(socios.filter((s) => s.original && s.original !== s.nombre).map((s) => [s.original, s.nombre]))
  const actual = (nombre) => renombres.get(nombre) ?? nombre
  return {
    ...datos,
    proyecto: { ...datos.proyecto, ...proyecto },
    precios: { ...datos.precios, ...precios },
    // Cada socio conserva lo que ya tenía guardado; el formulario solo trae nombre y tarifa.
    socios: socios.map(({ original, ...socio }) => ({ ...datos.socios.find((s) => s.nombre === original), ...socio })),
    etapas: [...etapas],
    tareas: datos.tareas.map((t) => ({ ...t, responsable: actual(t.responsable) })),
    horas: datos.horas.map((h) => ({ ...h, socio: actual(h.socio) })),
  }
}
