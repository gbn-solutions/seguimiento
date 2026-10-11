import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filasDeTareas, filasDeHoras, filasDeGastos, resumen } from '../js/calculo.js'
import { ejemplo } from './ejemplo.js'

const tarea = (id) => filasDeTareas(ejemplo).find((t) => t.id === id)
const gasto = (id) => filasDeGastos(ejemplo).find((g) => g.id === id)

test('una tarea cuesta sus horas previstas por la tarifa del responsable', () => {
  assert.equal(tarea('T01').tarifa, 1000)
  assert.equal(tarea('T01').costoPrevisto, 10000)
  assert.equal(tarea('T02').costoPrevisto, 40000)
  assert.equal(tarea('T01').datoDeCosto, 'Listo')
})

test('sin horas previstas o sin responsable el costo queda pendiente y dice por qué', () => {
  assert.equal(tarea('T04').costoPrevisto, null)
  assert.equal(tarea('T04').datoDeCosto, 'Faltan horas')
  assert.equal(tarea('T03').costoPrevisto, null)
  assert.equal(tarea('T03').datoDeCosto, 'Falta responsable')
})

test('las horas registradas se cobran a la tarifa de quien las trabajó, no del responsable', () => {
  assert.equal(tarea('T02').horasRegistradas, 17)
  assert.equal(tarea('T02').costoRegistrado, 15 * 2000 + 2 * 1000)
  assert.equal(tarea('T04').horasRegistradas, 0)
})

test('un registro de horas se valida contra tareas y socios existentes', () => {
  const datos = {
    ...ejemplo,
    horas: [
      ...ejemplo.horas,
      { id: 'x1', fecha: '2026-01-13', tarea: 'T99', socio: 'Ana', horas: 1 },
      { id: 'x2', fecha: '2026-01-13', tarea: 'T01', socio: 'Nadie', horas: 1 },
      { id: 'x3', fecha: '', tarea: 'T01', socio: 'Ana', horas: 1 },
      { id: 'x4', fecha: '2026-01-13', tarea: 'T01', socio: 'Ana', horas: 0 },
    ],
  }
  const por = Object.fromEntries(filasDeHoras(datos).map((h) => [h.id, h]))
  assert.equal(por.h1.validacion, 'Listo')
  assert.equal(por.h1.costo, 8000)
  assert.equal(por.x1.validacion, 'Tarea desconocida')
  assert.equal(por.x2.validacion, 'Socio desconocido')
  assert.equal(por.x3.validacion, 'Falta fecha')
  assert.equal(por.x4.validacion, 'Faltan horas')
  assert.equal(por.x2.costo, null)
})

test('un gasto solo es costo propio si está incluido y lo paga la empresa', () => {
  assert.equal(gasto('G01').costoPrevisto, 10000)
  assert.equal(gasto('G01').costoRegistrado, 12000)
  assert.equal(gasto('G01').datoDeCosto, 'Listo')
  assert.equal(gasto('G02').aplica, false)
  assert.equal(gasto('G02').datoDeCosto, 'No aplica')
  assert.equal(gasto('G05').aplica, false)
  assert.equal(gasto('G03').costoPrevisto, null)
  assert.equal(gasto('G03').datoDeCosto, 'Falta costo')
})

test('el avance cuenta solo las tareas marcadas, y se desglosa por etapa en orden', () => {
  const r = resumen(ejemplo)
  assert.deepEqual(r.avance, { hechas: 2, total: 4, porcentaje: 0.5 })
  assert.deepEqual(r.porEtapa, [
    { etapa: 'Diseño', hechas: 1, total: 1, porcentaje: 1 },
    { etapa: 'Desarrollo', hechas: 1, total: 2, porcentaje: 0.5 },
    { etapa: 'Cierre', hechas: 0, total: 1, porcentaje: 0 },
  ])
})

test('las horas del equipo se suman por socio con su costo', () => {
  const r = resumen(ejemplo)
  assert.equal(r.horasRegistradas, 25)
  assert.deepEqual(r.porSocio, [
    { nombre: 'Ana', tarifa: 1000, horas: 10, costo: 10000 },
    { nombre: 'Beto', tarifa: 2000, horas: 15, costo: 30000 },
  ])
})

test('la puesta en marcha suma lo conocido y cuenta lo que falta', () => {
  const { inicial } = resumen(ejemplo)
  assert.equal(inicial.horasPrevistas, 35)
  assert.equal(inicial.costoTrabajo, 50000)
  assert.equal(inicial.otrosGastos, 10000)
  assert.equal(inicial.costo, 60000)
  assert.equal(inicial.tareasSinCostear, 3)
  assert.equal(inicial.gastosSinMonto, 1)
  assert.equal(inicial.completo, false)
  assert.equal(inicial.margen, 40000)
  assert.equal(inicial.margenPorcentaje, 0.4)
  assert.equal(inicial.precioConIva, 119000)
})

test('la operación mensual queda completa cuando no falta ningún dato', () => {
  const { mensual } = resumen(ejemplo)
  assert.equal(mensual.costoTrabajo, 4000)
  assert.equal(mensual.otrosGastos, 3000)
  assert.equal(mensual.costo, 7000)
  assert.equal(mensual.completo, true)
  assert.equal(mensual.margen, 3000)
  assert.equal(mensual.precioConIva, 11900)
})

test('el resultado al horizonte considera el cobro inicial y todas las mensualidades', () => {
  const r = resumen(ejemplo)
  assert.equal(r.resultadoHorizonte, 100000 + 12 * 10000 - 60000 - 12 * 7000)
  assert.equal(r.completo, false)
  assert.equal(r.pendientesDeCosteo, 4)
})

test('un proyecto vacío no divide por cero', () => {
  const vacio = { ...ejemplo, tareas: [], horas: [], gastos: [], precios: { ...ejemplo.precios, cobroInicial: 0, mensualidad: 0 } }
  const r = resumen(vacio)
  assert.equal(r.avance.porcentaje, 0)
  assert.equal(r.inicial.margenPorcentaje, null)
  assert.equal(r.completo, true)
})
