// Arranque y estado de la página. Decide qué se ve y traduce cada acción del
// usuario en una mutación guardada en el repo de datos.

import { SECCIONES } from './campos.js'
import { guardarConfig, guardarUltimo, leerConfig, leerUltimo, olvidarConfig } from './config.js'
import { h } from './dom.js'
import { abrirDialogo } from './formulario.js'
import { crearAlmacen } from './github.js'
import { ajustesDe, guardarAjustes, guardarRegistro, nombreDeArchivo, proyectoVacio, quitarRegistro } from './modelo.js'
import { formularioDeAjustes, leerAjustes } from './vista-ajustes.js'
import { vistaConexion } from './vista-conexion.js'
import { vistaResumen } from './vista-resumen.js'
import { vistaTabla } from './vista-tabla.js'

const PESTANAS = [
  { clave: 'resumen', titulo: 'Resumen' },
  { clave: 'tareas', titulo: 'Tareas' },
  { clave: 'horas', titulo: 'Horas' },
  { clave: 'gastos', titulo: 'Gastos' },
]
const REFRESCO_MS = 60_000

const raiz = document.getElementById('app')
let estado = { config: leerConfig(), almacen: null, proyectos: [], actual: null, datos: null, pestana: 'resumen', cargando: false, error: null, leidoEn: 0 }

function actualizar(cambios) {
  estado = { ...estado, ...cambios }
  dibujar()
}

async function conOcupado(tarea) {
  actualizar({ cargando: true, error: null })
  try {
    await tarea()
  } catch (error) {
    actualizar({ error: error.message })
  } finally {
    actualizar({ cargando: false })
  }
}

let pedido = 0

async function cargar(nombre) {
  const turno = (pedido += 1)
  const { datos } = await estado.almacen.leer(nombre)
  // Si mientras tanto se pidió otro proyecto, esta respuesta llegó tarde y se descarta.
  if (turno !== pedido) return
  guardarUltimo(nombre)
  actualizar({ actual: nombre, datos, leidoEn: Date.now() })
}

async function conectar(config) {
  const almacen = crearAlmacen(config)
  const proyectos = await almacen.listar()
  guardarConfig(config)
  actualizar({ config, almacen, proyectos, actual: null, datos: null })
  const ultimo = leerUltimo()
  const elegido = proyectos.includes(ultimo) ? ultimo : proyectos[0]
  if (elegido) await cargar(elegido)
}

function desconectar() {
  olvidarConfig()
  actualizar({ config: leerConfig(), almacen: null, proyectos: [], actual: null, datos: null, error: null })
}

// Toda escritura pasa por acá: el almacén relee la última versión, aplica el cambio y guarda.
async function cambiar(mutacion, mensaje) {
  const datos = await estado.almacen.cambiar(estado.actual, mutacion, `${estado.actual}: ${mensaje}`)
  actualizar({ datos, leidoEn: Date.now() })
}

function editarRegistro(coleccion, id) {
  const seccion = SECCIONES[coleccion]
  const existente = id === null ? null : estado.datos[coleccion].find((r) => r.id === id)
  abrirDialogo({
    titulo: existente ? `Editar ${seccion.singular}` : `Agregar ${seccion.singular}`,
    campos: seccion.campos,
    valores: existente ?? seccion.nuevo(estado.datos),
    datos: estado.datos,
    alGuardar: (registro) =>
      cambiar((d) => guardarRegistro(d, coleccion, registro, existente ?? null), `guarda ${seccion.singular} ${seccion.idOculto ? registro.tarea : registro.id}`),
    alEliminar: existente
      ? () => cambiar((d) => quitarRegistro(d, coleccion, existente.id), `quita ${seccion.singular} ${seccion.idOculto ? existente.tarea : existente.id}`)
      : null,
  })
}

function editarAjustes() {
  const vistos = ajustesDe(estado.datos)
  abrirDialogo({
    titulo: 'Ajustes del proyecto',
    contenido: formularioDeAjustes(estado.datos),
    leer: leerAjustes,
    alGuardar: (ajustes) => cambiar((d) => guardarAjustes(d, ajustes, vistos), 'guarda ajustes'),
  })
}

function nuevoProyecto() {
  const hayBase = estado.datos !== null
  abrirDialogo({
    titulo: 'Nuevo proyecto',
    textoGuardar: 'Crear',
    campos: [
      { clave: 'nombre', etiqueta: 'Nombre del proyecto', tipo: 'texto', requerido: true, ancho: true },
      { clave: 'cliente', etiqueta: 'Cliente', tipo: 'texto', ancho: true },
      ...(hayBase ? [{ clave: 'copiar', etiqueta: `Copiar socios, tarifas y etapas de «${estado.actual}»`, tipo: 'si-no', ancho: true }] : []),
    ],
    valores: { copiar: hayBase },
    alGuardar: async ({ nombre, cliente, copiar }) => {
      const archivo = nombreDeArchivo(nombre)
      const base = proyectoVacio(nombre)
      const heredado = copiar
        ? { socios: estado.datos.socios, etapas: estado.datos.etapas, proyecto: { ...base.proyecto, empresa: estado.datos.proyecto.empresa } }
        : {}
      const datos = { ...base, ...heredado, proyecto: { ...(heredado.proyecto ?? base.proyecto), cliente } }
      await estado.almacen.crear(archivo, datos)
      guardarUltimo(archivo)
      actualizar({ proyectos: [...estado.proyectos, archivo].sort(), actual: archivo, datos, pestana: 'tareas', leidoEn: Date.now() })
    },
  })
}

function cabecera() {
  const selector = h(
    'select',
    { 'aria-label': 'Proyecto', onchange: (e) => conOcupado(() => cargar(e.target.value)) },
    estado.proyectos.map((p) => h('option', { value: p, selected: p === estado.actual }, p)),
  )
  return h(
    'header',
    { class: 'cabecera' },
    h('div', { class: 'cabecera-titulo' }, h('h1', {}, 'Seguimiento y costeo'), estado.datos ? h('p', {}, [estado.datos.proyecto.nombre, estado.datos.proyecto.cliente].filter(Boolean).join(' · ')) : null),
    h(
      'div',
      { class: 'cabecera-acciones' },
      estado.proyectos.length ? selector : null,
      h('button', { class: 'boton', onclick: nuevoProyecto }, 'Nuevo proyecto'),
      estado.datos ? h('button', { class: 'boton', onclick: editarAjustes }, 'Ajustes') : null,
      estado.actual ? h('button', { class: 'boton', onclick: () => conOcupado(() => cargar(estado.actual)) }, 'Actualizar') : null,
      h('button', { class: 'boton', onclick: desconectar }, 'Desconectar'),
    ),
  )
}

function pestanas() {
  return h(
    'nav',
    { class: 'pestanas', 'aria-label': 'Secciones' },
    PESTANAS.map((p) =>
      h('button', { class: `pestana${p.clave === estado.pestana ? ' activa' : ''}`, 'aria-current': p.clave === estado.pestana ? 'page' : null, onclick: () => actualizar({ pestana: p.clave }) }, p.titulo),
    ),
  )
}

function contenido() {
  if (!estado.datos) {
    return h('div', { class: 'panel' }, h('h2', {}, estado.cargando ? 'Cargando…' : 'Todavía no hay proyectos'), estado.cargando ? null : h('p', {}, 'Crea el primero con «Nuevo proyecto».'))
  }
  if (estado.pestana === 'resumen') return vistaResumen(estado.datos)
  const coleccion = estado.pestana
  return vistaTabla({
    seccion: SECCIONES[coleccion],
    datos: estado.datos,
    alAgregar: () => editarRegistro(coleccion, null),
    alEditar: (id) => editarRegistro(coleccion, id),
  })
}

// La configuración escrita se guarda en el estado antes de conectar, para que un
// token rechazado no borre lo que la persona acaba de tipear.
function alConectar(config) {
  estado = { ...estado, config }
  conOcupado(() => conectar(config))
}

function dibujar() {
  if (!estado.almacen) {
    raiz.replaceChildren(
      h('header', { class: 'cabecera' }, h('div', { class: 'cabecera-titulo' }, h('h1', {}, 'Seguimiento y costeo'))),
      h('main', {}, vistaConexion({ config: estado.config, error: estado.error, alConectar })),
    )
    return
  }
  raiz.replaceChildren(
    cabecera(),
    estado.datos ? pestanas() : '',
    h('main', { 'aria-busy': estado.cargando ? 'true' : null }, estado.error ? h('p', { class: 'aviso aviso-error', role: 'alert' }, estado.error) : null, contenido()),
  )
}

// Al volver a la pestaña después de un rato, se traen los cambios de los otros socios.
document.addEventListener('visibilitychange', () => {
  const vencido = Date.now() - estado.leidoEn > REFRESCO_MS
  const dialogoAbierto = document.querySelector('dialog[open]') !== null
  if (document.visibilityState === 'visible' && estado.actual && vencido && !estado.cargando && !dialogoAbierto) {
    conOcupado(() => cargar(estado.actual))
  }
})

dibujar()
if (estado.config.token) conOcupado(() => conectar(estado.config))
