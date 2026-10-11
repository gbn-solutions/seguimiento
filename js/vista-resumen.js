// El tablero: avance, datos que faltan, costo y margen. Solo muestra lo que calcula `calculo.js`.

import { resumen } from './calculo.js'
import { h, horas, moneda, porcentaje } from './dom.js'

const tarjeta = (titulo, valor, detalle) =>
  h('div', { class: 'tarjeta' }, h('span', { class: 'tarjeta-titulo' }, titulo), h('strong', {}, valor), detalle ? h('small', {}, detalle) : null)

// <progress> y no un <span> con ancho en línea: la política de seguridad de la página prohíbe estilos en línea.
const barra = (fraccion) => h('progress', { class: 'barra', max: 100, value: Math.round(fraccion * 100) })

const renglon = (etiqueta, valor, clase) => h('tr', { class: clase ?? null }, h('th', { scope: 'row' }, etiqueta), h('td', { class: 'numerica' }, valor))

const pendiente = (cantidad) => (cantidad === 0 ? h('span', { class: 'marca marca-bien' }, '✓') : h('span', { class: 'marca marca-falta' }, String(cantidad)))

function bloqueDeCosteo(titulo, etiquetas, b) {
  const faltan = b.tareasSinCostear + b.gastosSinMonto
  return h(
    'div',
    { class: 'panel' },
    h('h3', {}, titulo),
    faltan > 0
      ? h('p', { class: 'aviso aviso-falta' }, `Cifras parciales: faltan ${faltan} dato${faltan === 1 ? '' : 's'} de costo. El costo real será mayor.`)
      : null,
    h(
      'table',
      { class: 'tabla-resumen' },
      h(
        'tbody',
        {},
        renglon(etiquetas.horas, horas(b.horasPrevistas)),
        renglon(etiquetas.trabajo, moneda(b.costoTrabajo)),
        renglon(etiquetas.gastos, moneda(b.otrosGastos)),
        renglon(etiquetas.costo, moneda(b.costo), 'fuerte'),
        renglon(etiquetas.cobro, moneda(b.cobro)),
        renglon(etiquetas.margen, moneda(b.margen), b.margen < 0 ? 'fuerte negativo' : 'fuerte'),
        renglon('Margen %', porcentaje(b.margenPorcentaje)),
        renglon('Precio con IVA', moneda(b.precioConIva)),
      ),
    ),
  )
}

export function vistaResumen(datos) {
  const r = resumen(datos)
  return h(
    'section',
    {},
    h(
      'div',
      { class: 'tarjetas' },
      tarjeta('Avance de tareas', porcentaje(r.avance.porcentaje), barra(r.avance.porcentaje)),
      tarjeta('Tareas cerradas', `${r.avance.hechas} / ${r.avance.total}`),
      tarjeta('Horas registradas', horas(r.horasRegistradas)),
      tarjeta('Pendientes de costeo', String(r.pendientesDeCosteo), r.pendientesDeCosteo ? 'Datos que faltan para un costo confiable' : 'Costeo completo'),
    ),
    h(
      'div',
      { class: 'dos-columnas' },
      h(
        'div',
        { class: 'panel' },
        h('h3', {}, 'Avance por etapa'),
        r.porEtapa.length
          ? h('table', { class: 'tabla-resumen' }, h('tbody', {}, r.porEtapa.map((e) =>
              h('tr', {}, h('th', { scope: 'row' }, e.etapa), h('td', {}, barra(e.porcentaje)), h('td', { class: 'numerica' }, `${e.hechas} / ${e.total}`)),
            )))
          : h('p', { class: 'tenue' }, 'Sin tareas que cuenten para el avance.'),
      ),
      h(
        'div',
        { class: 'panel' },
        h('h3', {}, 'Datos que faltan'),
        h(
          'table',
          { class: 'tabla-resumen' },
          h(
            'tbody',
            {},
            renglon('Tareas iniciales sin costear', pendiente(r.inicial.tareasSinCostear)),
            renglon('Tareas mensuales sin costear', pendiente(r.mensual.tareasSinCostear)),
            renglon('Gastos iniciales sin monto', pendiente(r.inicial.gastosSinMonto)),
            renglon('Gastos mensuales sin monto', pendiente(r.mensual.gastosSinMonto)),
            renglon('Registros de horas incompletos', pendiente(r.registrosIncompletos)),
          ),
        ),
      ),
    ),
    h(
      'div',
      { class: 'dos-columnas' },
      bloqueDeCosteo('Puesta en marcha', { horas: 'Horas previstas', trabajo: 'Costo del trabajo previsto', gastos: 'Otros gastos previstos', costo: 'Costo inicial', cobro: 'Cobro inicial', margen: 'Margen estimado' }, r.inicial),
      bloqueDeCosteo('Operación mensual', { horas: 'Horas previstas al mes', trabajo: 'Costo del trabajo al mes', gastos: 'Otros gastos al mes', costo: 'Costo mensual', cobro: 'Mensualidad', margen: 'Margen mensual' }, r.mensual),
    ),
    h(
      'div',
      { class: `panel destacado${r.resultadoHorizonte < 0 ? ' negativo' : ''}` },
      h('h3', {}, `Resultado a ${r.horizonteMeses} meses`),
      h('strong', {}, moneda(r.resultadoHorizonte)),
      h('p', { class: 'tenue' }, `Cobro inicial más ${r.horizonteMeses} mensualidades, menos el costo inicial y ${r.horizonteMeses} meses de operación.${r.completo ? '' : ' Cifra parcial mientras falten datos de costo.'}`),
    ),
    h(
      'div',
      { class: 'panel' },
      h('h3', {}, 'Horas del equipo'),
      h(
        'div',
        { class: 'tabla-contenedor' },
        h(
          'table',
          { class: 'tabla' },
          h('thead', {}, h('tr', {}, h('th', {}, 'Socio'), h('th', { class: 'numerica' }, 'Tarifa / h'), h('th', { class: 'numerica' }, 'Horas'), h('th', { class: 'numerica' }, 'Costo registrado'))),
          h('tbody', {}, r.porSocio.length
            ? r.porSocio.map((s) => h('tr', { class: 'fija' }, h('td', {}, s.nombre), h('td', { class: 'numerica' }, moneda(s.tarifa)), h('td', { class: 'numerica' }, horas(s.horas)), h('td', { class: 'numerica' }, moneda(s.costo))))
            : h('tr', { class: 'vacia' }, h('td', { colspan: 4 }, 'Agrega los socios en Ajustes.'))),
        ),
      ),
    ),
  )
}
