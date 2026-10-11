// Todas las fórmulas del costeo. Funciones puras: reciben los datos del proyecto
// y devuelven filas y totales nuevos, sin tocar lo que reciben.

export const EMPRESA = 'Empresa'

const esNumero = (v) => typeof v === 'number' && Number.isFinite(v)
const suma = (valores) => valores.reduce((total, v) => total + v, 0)
const razon = (parte, total) => (total > 0 ? parte / total : 0)

const tarifaDe = (datos, nombre) => {
  const socio = datos.socios.find((s) => s.nombre === nombre)
  return socio && esNumero(socio.tarifa) ? socio.tarifa : null
}

function datoDeCostoDeTarea(tarea, tarifa) {
  if (!esNumero(tarea.horasPrevistas)) return 'Faltan horas'
  if (tarifa === null) return 'Falta responsable'
  return 'Listo'
}

export function filasDeTareas(datos) {
  return datos.tareas.map((tarea) => {
    const tarifa = tarifaDe(datos, tarea.responsable)
    const registros = datos.horas.filter((h) => h.tarea === tarea.id && esNumero(h.horas))
    const datoDeCosto = datoDeCostoDeTarea(tarea, tarifa)
    return {
      ...tarea,
      tarifa,
      costoPrevisto: datoDeCosto === 'Listo' ? tarea.horasPrevistas * tarifa : null,
      horasRegistradas: suma(registros.map((h) => h.horas)),
      costoRegistrado: suma(registros.map((h) => h.horas * (tarifaDe(datos, h.socio) ?? 0))),
      datoDeCosto,
    }
  })
}

function validacionDeHoras(datos, registro, tarifa) {
  if (!registro.fecha) return 'Falta fecha'
  if (!datos.tareas.some((t) => t.id === registro.tarea)) return 'Tarea desconocida'
  if (tarifa === null) return 'Socio desconocido'
  if (!esNumero(registro.horas) || registro.horas <= 0) return 'Faltan horas'
  return 'Listo'
}

export function filasDeHoras(datos) {
  return datos.horas.map((registro) => {
    const tarifa = tarifaDe(datos, registro.socio)
    const validacion = validacionDeHoras(datos, registro, tarifa)
    return {
      ...registro,
      tarifa,
      costo: tarifa !== null && esNumero(registro.horas) ? registro.horas * tarifa : null,
      validacion,
    }
  })
}

const montoDe = (cantidad, unitario) => (esNumero(cantidad) && esNumero(unitario) ? cantidad * unitario : null)

export function filasDeGastos(datos) {
  return datos.gastos.map((gasto) => {
    const aplica = gasto.incluir === true && gasto.pagador === EMPRESA
    const costoPrevisto = aplica ? montoDe(gasto.cantidad, gasto.unitarioPrevisto) : null
    return {
      ...gasto,
      aplica,
      costoPrevisto,
      costoRegistrado: aplica ? montoDe(gasto.cantidad, gasto.unitarioReal) : null,
      datoDeCosto: !aplica ? 'No aplica' : costoPrevisto === null ? 'Falta costo' : 'Listo',
    }
  })
}

function avanceDe(tareas) {
  const hechas = tareas.filter((t) => t.estado === 'Hecha').length
  return { hechas, total: tareas.length, porcentaje: razon(hechas, tareas.length) }
}

function avancePorEtapa(datos, tareas) {
  const etapas = [...datos.etapas, ...new Set(tareas.map((t) => t.etapa).filter((e) => !datos.etapas.includes(e)))]
  return etapas
    .map((etapa) => ({ etapa, ...avanceDe(tareas.filter((t) => t.etapa === etapa)) }))
    .filter((fila) => fila.total > 0)
}

function horasPorSocio(datos, horas) {
  return datos.socios.map((socio) => {
    const propias = horas.filter((h) => h.socio === socio.nombre && esNumero(h.horas))
    const total = suma(propias.map((h) => h.horas))
    return { nombre: socio.nombre, tarifa: socio.tarifa, horas: total, costo: total * (socio.tarifa ?? 0) }
  })
}

// Un bloque de costeo: la puesta en marcha (Inicial) o la operación de cada mes (Mensual).
function bloque(tipo, tareas, gastos, cobro, iva) {
  const propias = tareas.filter((t) => t.tipoCosto === tipo)
  const aplicables = gastos.filter((g) => g.frecuencia === tipo && g.aplica)
  const costoTrabajo = suma(propias.map((t) => t.costoPrevisto ?? 0))
  const otrosGastos = suma(aplicables.map((g) => g.costoPrevisto ?? 0))
  const tareasSinCostear = propias.filter((t) => t.datoDeCosto !== 'Listo').length
  const gastosSinMonto = aplicables.filter((g) => g.datoDeCosto !== 'Listo').length
  const costo = costoTrabajo + otrosGastos
  const margen = cobro - costo
  return {
    horasPrevistas: suma(propias.map((t) => (esNumero(t.horasPrevistas) ? t.horasPrevistas : 0))),
    costoTrabajo,
    otrosGastos,
    costo,
    cobro,
    margen,
    margenPorcentaje: cobro > 0 ? margen / cobro : null,
    precioConIva: Math.round(cobro * (1 + iva)),
    tareasSinCostear,
    gastosSinMonto,
    completo: tareasSinCostear === 0 && gastosSinMonto === 0,
  }
}

export function resumen(datos) {
  const tareas = filasDeTareas(datos)
  const gastos = filasDeGastos(datos)
  const horas = filasDeHoras(datos)
  const { cobroInicial = 0, mensualidad = 0, iva = 0, horizonteMeses = 12 } = datos.precios
  const queCuentan = tareas.filter((t) => t.cuentaAvance)
  const inicial = bloque('Inicial', tareas, gastos, cobroInicial, iva)
  const mensual = bloque('Mensual', tareas, gastos, mensualidad, iva)
  return {
    avance: avanceDe(queCuentan),
    porEtapa: avancePorEtapa(datos, queCuentan),
    horasRegistradas: suma(horas.map((h) => (esNumero(h.horas) ? h.horas : 0))),
    registrosIncompletos: horas.filter((h) => h.validacion !== 'Listo').length,
    porSocio: horasPorSocio(datos, horas),
    inicial,
    mensual,
    horizonteMeses,
    resultadoHorizonte: inicial.margen + horizonteMeses * mensual.margen,
    completo: inicial.completo && mensual.completo,
    pendientesDeCosteo:
      inicial.tareasSinCostear + inicial.gastosSinMonto + mensual.tareasSinCostear + mensual.gastosSinMonto,
  }
}
