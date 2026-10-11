import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  ErrorDeDatos,
  ajustesDe,
  guardarAjustes,
  guardarRegistro,
  nombreDeArchivo,
  proyectoVacio,
  quitarRegistro,
  serializar,
  siguienteId,
  validarProyecto,
} from '../js/modelo.js'
import { ejemplo } from './ejemplo.js'

test('un proyecto vacío es válido y sobrevive a guardarse y leerse', () => {
  const vacio = proyectoVacio('Nuevo')
  assert.deepEqual(validarProyecto(JSON.parse(serializar(vacio))), vacio)
})

test('un archivo que no es un proyecto se rechaza con un mensaje claro', () => {
  assert.throws(() => validarProyecto(null), ErrorDeDatos)
  assert.throws(() => validarProyecto([]), ErrorDeDatos)
  assert.throws(() => validarProyecto({ ...ejemplo, version: 99 }), /Versión/)
  assert.throws(() => validarProyecto({ ...ejemplo, horas: 'x' }), /horas/)
  assert.throws(() => validarProyecto({ ...ejemplo, precios: null }), /precios/)
  assert.throws(() => validarProyecto({ ...ejemplo, tareas: [null] }), /no es un registro/)
  assert.throws(() => validarProyecto({ ...ejemplo, precios: { ...ejemplo.precios, iva: '0.19' } }), /número/)
})

test('el nombre del archivo sale del nombre del proyecto, sin tildes ni espacios', () => {
  assert.equal(nombreDeArchivo('  Café Ñandú 2  '), 'cafe-nandu-2')
  assert.throws(() => nombreDeArchivo('¡!'), ErrorDeDatos)
})

test('el siguiente ID continúa la numeración del prefijo', () => {
  assert.equal(siguienteId(ejemplo.tareas, 'T'), 'T05')
  assert.equal(siguienteId(ejemplo.gastos, 'G'), 'G06')
  assert.equal(siguienteId([], 'T'), 'T01')
  assert.equal(siguienteId([{ id: 'T04a' }, { id: 'T04f' }], 'T'), 'T05')
})

test('guardar agrega un registro nuevo sin tocar el proyecto original', () => {
  const nuevo = { id: 'h9', fecha: '2026-02-01', tarea: 'T01', socio: 'Ana', horas: 1 }
  const despues = guardarRegistro(ejemplo, 'horas', nuevo)
  assert.equal(despues.horas.length, ejemplo.horas.length + 1)
  assert.equal(ejemplo.horas.length, 3)
  assert.deepEqual(despues.horas.at(-1), nuevo)
})

test('guardar reemplaza el registro editado y conserva su lugar', () => {
  const editada = { ...ejemplo.tareas[1], estado: 'Pendiente' }
  const despues = guardarRegistro(ejemplo, 'tareas', editada, ejemplo.tareas[1])
  assert.equal(despues.tareas.length, ejemplo.tareas.length)
  assert.equal(despues.tareas[1].estado, 'Pendiente')
})

test('si una tarea cambia de ID, sus horas la siguen', () => {
  const despues = guardarRegistro(ejemplo, 'tareas', { ...ejemplo.tareas[2], id: 'T02a' }, ejemplo.tareas[2])
  assert.deepEqual(despues.horas.map((h) => h.tarea), ['T01', 'T02a', 'T02a'])
})

test('no se aceptan IDs repetidos, vacíos ni colecciones inventadas', () => {
  assert.throws(() => guardarRegistro(ejemplo, 'tareas', { ...ejemplo.tareas[0], id: 'T01' }, ejemplo.tareas[0]), /Ya existe/)
  assert.throws(() => guardarRegistro(ejemplo, 'tareas', { id: 'T01' }), /Ya existe/)
  assert.throws(() => guardarRegistro(ejemplo, 'tareas', { id: '' }), /ID/)
  assert.throws(() => guardarRegistro(ejemplo, 'socios', { id: 'x' }), /Colección/)
})

test('si otro socio cambió o borró el registro mientras se editaba, no se pisa', () => {
  const visto = ejemplo.tareas[1]
  const delOtro = guardarRegistro(ejemplo, 'tareas', { ...visto, estado: 'En curso' }, visto)
  assert.throws(() => guardarRegistro(delOtro, 'tareas', { ...visto, bloqueo: 'x' }, visto), /Otro socio/)
  const borrado = quitarRegistro(ejemplo, 'gastos', 'G05')
  assert.throws(() => guardarRegistro(borrado, 'gastos', ejemplo.gastos[4], ejemplo.gastos[4]), /Otro socio/)
})

test('los ajustes no pisan los que guardó otro socio entre medio', () => {
  const vistos = ajustesDe(ejemplo)
  const cambio = { proyecto: {}, precios: { mensualidad: 1 }, socios: ejemplo.socios, etapas: ejemplo.etapas }
  const delOtro = guardarAjustes(ejemplo, cambio, vistos)
  assert.equal(delOtro.precios.mensualidad, 1)
  assert.throws(() => guardarAjustes(delOtro, { ...cambio, precios: { cobroInicial: 2 } }, vistos), /Otro socio/)
})

test('un socio conserva sus otros datos al guardar los ajustes', () => {
  const con = { ...ejemplo, socios: [{ nombre: 'Ana', tarifa: 1000, correo: 'a@ejemplo.test' }] }
  const despues = guardarAjustes(con, { proyecto: {}, precios: {}, socios: [{ original: 'Ana', nombre: 'Ana', tarifa: 2 }], etapas: [] })
  assert.deepEqual(despues.socios, [{ nombre: 'Ana', tarifa: 2, correo: 'a@ejemplo.test' }])
})

test('quitar saca el registro, pero no una tarea que tiene horas', () => {
  assert.equal(quitarRegistro(ejemplo, 'horas', 'h1').horas.length, 2)
  assert.equal(quitarRegistro(ejemplo, 'tareas', 'T04').tareas.length, 5)
  assert.throws(() => quitarRegistro(ejemplo, 'tareas', 'T01'), /horas registradas/)
})

test('al renombrar un socio, sus tareas y horas conservan el vínculo', () => {
  const despues = guardarAjustes(ejemplo, {
    proyecto: { nombre: 'Otro' },
    precios: { cobroInicial: 5 },
    socios: [
      { original: 'Ana', nombre: 'Ana María', tarifa: 1500 },
      { original: 'Beto', nombre: 'Beto', tarifa: 2000 },
      { original: null, nombre: 'Caro', tarifa: 3000 },
    ],
    etapas: ['Única'],
  })
  assert.equal(despues.proyecto.nombre, 'Otro')
  assert.equal(despues.proyecto.cliente, 'Cliente de prueba')
  assert.equal(despues.precios.cobroInicial, 5)
  assert.equal(despues.precios.mensualidad, 10000)
  assert.deepEqual(despues.socios[0], { nombre: 'Ana María', tarifa: 1500 })
  assert.equal(despues.tareas[1].responsable, 'Ana María')
  assert.deepEqual(despues.horas.map((h) => h.socio), ['Ana María', 'Beto', 'Ana María'])
  assert.equal(ejemplo.socios[0].nombre, 'Ana')
})

test('los ajustes rechazan socios sin nombre o repetidos', () => {
  const base = { proyecto: {}, precios: {}, etapas: [] }
  assert.throws(() => guardarAjustes(ejemplo, { ...base, socios: [{ nombre: '', tarifa: 1 }] }), /nombre/)
  assert.throws(
    () => guardarAjustes(ejemplo, { ...base, socios: [{ nombre: 'A', tarifa: 1 }, { nombre: 'A', tarifa: 2 }] }),
    /mismo nombre/,
  )
})
