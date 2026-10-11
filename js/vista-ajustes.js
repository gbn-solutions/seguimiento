// Ajustes del proyecto: nombre, precios, socios con su tarifa y etapas.

import { h } from './dom.js'

const campo = (etiqueta, control, ancho) => h('label', { class: `campo${ancho ? ' campo-ancho' : ''}` }, h('span', {}, etiqueta), control)
const texto = (name, value) => h('input', { type: 'text', name, value: value ?? '' })
const cifra = (name, value, extra = {}) => h('input', { type: 'number', name, step: 'any', min: 0, inputmode: 'decimal', value: value ?? '', ...extra })

function filaDeSocio(socio) {
  const fila = h(
    'div',
    { class: 'fila-socio', 'data-original': socio.nombre ?? '' },
    h('input', { type: 'text', name: 'socio-nombre', value: socio.nombre ?? '', placeholder: 'Nombre', 'aria-label': 'Nombre del socio', required: true }),
    h('input', { type: 'number', name: 'socio-tarifa', value: socio.tarifa ?? '', placeholder: 'Tarifa por hora', 'aria-label': 'Tarifa por hora', min: 0, step: 'any', required: true }),
    h('button', { type: 'button', class: 'boton', 'aria-label': 'Quitar socio', onclick: () => fila.remove() }, 'Quitar'),
  )
  return fila
}

export function formularioDeAjustes(datos) {
  const socios = h('div', { class: 'socios' }, datos.socios.map(filaDeSocio))
  return h(
    'div',
    {},
    h(
      'div',
      { class: 'campos' },
      campo('Nombre del proyecto', texto('nombre', datos.proyecto.nombre)),
      campo('Cliente', texto('cliente', datos.proyecto.cliente)),
      campo('Nombre de la empresa (aparece como pagador)', texto('empresa', datos.proyecto.empresa), true),
      campo('Cobro inicial (neto)', cifra('cobroInicial', datos.precios.cobroInicial)),
      campo('Mensualidad (neta)', cifra('mensualidad', datos.precios.mensualidad)),
      campo('IVA %', cifra('iva', Number(((datos.precios.iva ?? 0) * 100).toFixed(6)), { max: 100 })),
      campo('Horizonte de evaluación (meses)', cifra('horizonteMeses', datos.precios.horizonteMeses, { step: 1, min: 1 })),
    ),
    h('h3', {}, 'Socios y tarifa por hora'),
    socios,
    h('button', { type: 'button', class: 'boton', onclick: () => socios.append(filaDeSocio({})) }, 'Agregar socio'),
    h('h3', {}, 'Etapas, una por línea'),
    h('textarea', { name: 'etapas', rows: 8, 'aria-label': 'Etapas' }, datos.etapas.join('\n')),
  )
}

const numeroDe = (formulario, nombre) => Number(formulario.elements.namedItem(nombre).value || 0)
const textoDe = (formulario, nombre) => formulario.elements.namedItem(nombre).value.trim()

export function leerAjustes(formulario) {
  return {
    proyecto: { nombre: textoDe(formulario, 'nombre'), cliente: textoDe(formulario, 'cliente'), empresa: textoDe(formulario, 'empresa') || 'Empresa' },
    precios: {
      cobroInicial: numeroDe(formulario, 'cobroInicial'),
      mensualidad: numeroDe(formulario, 'mensualidad'),
      iva: numeroDe(formulario, 'iva') / 100,
      horizonteMeses: Math.max(1, Math.round(numeroDe(formulario, 'horizonteMeses'))),
    },
    socios: [...formulario.querySelectorAll('.fila-socio')].map((fila) => ({
      original: fila.dataset.original || null,
      nombre: fila.querySelector('[name="socio-nombre"]').value.trim(),
      tarifa: Number(fila.querySelector('[name="socio-tarifa"]').value || 0),
    })),
    etapas: textoDe(formulario, 'etapas').split('\n').map((e) => e.trim()).filter(Boolean),
  }
}
