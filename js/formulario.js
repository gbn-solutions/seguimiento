// Un formulario en un <dialog>, armado a partir de la lista de campos de `campos.js`.

import { h } from './dom.js'

function opcionesDe(campo, valor, datos) {
  const opciones = campo.opciones(datos)
  // Un valor que ya no está en la lista (un socio que se quitó) se conserva visible
  // en vez de perderse en silencio al guardar.
  const huerfano = valor && !opciones.some((o) => o.valor === valor) ? [{ valor, etiqueta: `${valor} (ya no existe)` }] : []
  const vacia = campo.requerido ? [] : [{ valor: '', etiqueta: campo.vacio ?? '—' }]
  return [...vacia, ...opciones, ...huerfano]
}

function control(campo, valor, datos) {
  const comunes = { name: campo.clave, required: campo.requerido }
  if (campo.tipo === 'opcion') {
    const opciones = opcionesDe(campo, valor, datos)
    return h('select', comunes, opciones.map((o) => h('option', { value: o.valor, selected: o.valor === (valor ?? '') }, o.etiqueta)))
  }
  if (campo.tipo === 'si-no') return h('input', { ...comunes, type: 'checkbox', checked: valor === true, required: false })
  if (campo.tipo === 'area') return h('textarea', { ...comunes, rows: 3 }, valor ?? '')
  if (campo.tipo === 'numero') {
    return h('input', { ...comunes, type: 'number', step: 'any', min: campo.minimo ?? 0, inputmode: 'decimal', value: valor ?? '' })
  }
  return h('input', { ...comunes, type: campo.tipo === 'fecha' ? 'date' : 'text', value: valor ?? '' })
}

function fila(campo, valor, datos) {
  const clase = ['campo', campo.ancho ? 'campo-ancho' : '', campo.tipo === 'si-no' ? 'campo-casilla' : ''].join(' ').trim()
  return h('label', { class: clase }, h('span', {}, campo.etiqueta), control(campo, valor, datos))
}

export function leerCampos(formulario, campos) {
  return Object.fromEntries(
    campos.map((campo) => {
      const elemento = formulario.elements.namedItem(campo.clave)
      if (campo.tipo === 'si-no') return [campo.clave, elemento.checked]
      if (campo.tipo === 'numero') return [campo.clave, elemento.value === '' ? null : Number(elemento.value)]
      return [campo.clave, elemento.value.trim()]
    }),
  )
}

// `contenido` permite formularios a medida (los ajustes); `campos` arma uno estándar.
export function abrirDialogo({ titulo, campos = [], valores = {}, datos, contenido, leer, alGuardar, alEliminar, textoGuardar = 'Guardar' }) {
  const aviso = h('p', { class: 'aviso aviso-error', role: 'alert', hidden: true })
  const guardar = h('button', { type: 'submit', class: 'boton boton-principal' }, textoGuardar)
  const cancelar = h('button', { type: 'button', class: 'boton', onclick: () => dialogo.close() }, 'Cancelar')
  const eliminar = alEliminar ? h('button', { type: 'button', class: 'boton boton-peligro' }, 'Eliminar') : null
  const botones = [eliminar, cancelar, guardar].filter(Boolean)

  const formulario = h(
    'form',
    { class: 'formulario', novalidate: false },
    h('h2', {}, titulo),
    contenido ?? h('div', { class: 'campos' }, campos.map((c) => fila(c, valores[c.clave], datos))),
    aviso,
    h('div', { class: 'acciones' }, eliminar, h('span', { class: 'espacio' }), cancelar, guardar),
  )
  const dialogo = h('dialog', { class: 'dialogo' }, formulario)

  async function ejecutar(accion) {
    aviso.hidden = true
    for (const b of botones) b.disabled = true
    try {
      await accion()
      dialogo.close()
    } catch (error) {
      aviso.textContent = error.message
      aviso.hidden = false
    } finally {
      for (const b of botones) b.disabled = false
    }
  }

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault()
    const leidos = leer ? leer(formulario) : { ...valores, ...leerCampos(formulario, campos) }
    ejecutar(() => alGuardar(leidos))
  })
  if (eliminar) {
    // Dos toques para borrar: el primero pide confirmación en el mismo botón.
    eliminar.addEventListener('click', () => {
      if (eliminar.dataset.confirmar !== 'si') {
        eliminar.dataset.confirmar = 'si'
        eliminar.textContent = '¿Seguro? Toca de nuevo'
        return
      }
      ejecutar(alEliminar)
    })
  }
  dialogo.addEventListener('close', () => dialogo.remove())
  document.body.append(dialogo)
  dialogo.showModal()
  return dialogo
}
