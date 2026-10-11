// La tabla de una sección (tareas, horas o gastos). Tocar una fila la abre para editarla.

import { h } from './dom.js'

const claseDeMarca = (texto) => {
  if (['Listo', 'Hecha'].includes(texto)) return 'marca marca-bien'
  if (['No aplica', 'Pendiente'].includes(texto)) return 'marca marca-neutra'
  if (texto === 'En curso') return 'marca marca-curso'
  return 'marca marca-falta'
}

function celda(columna, fila, datos) {
  const texto = columna.valor(fila, datos) ?? ''
  const clase = [columna.numerica ? 'numerica' : '', columna.ancha ? 'ancha' : ''].join(' ').trim()
  const contenido = columna.marca && texto ? h('span', { class: claseDeMarca(columna.marca(fila)) }, texto) : texto
  return h('td', { class: clase || null }, contenido)
}

export function vistaTabla({ seccion, datos, alAgregar, alEditar }) {
  const filas = seccion.filas(datos)
  const cuerpo = filas.length
    ? filas.map((fila) =>
        h(
          'tr',
          {
            tabindex: 0,
            onclick: () => alEditar(fila.id),
            onkeydown: (e) => (e.key === 'Enter' ? alEditar(fila.id) : null),
          },
          seccion.columnas.map((c) => celda(c, fila, datos)),
        ),
      )
    : h('tr', { class: 'vacia' }, h('td', { colspan: seccion.columnas.length }, `Todavía no hay ningún ${seccion.singular}.`))

  return h(
    'section',
    {},
    h(
      'div',
      { class: 'encabezado-seccion' },
      h('h2', {}, seccion.titulo),
      h('button', { class: 'boton boton-principal', onclick: alAgregar }, `Agregar ${seccion.singular}`),
    ),
    h(
      'div',
      { class: 'tabla-contenedor' },
      h(
        'table',
        { class: 'tabla' },
        h('thead', {}, h('tr', {}, seccion.columnas.map((c) => h('th', { class: c.numerica ? 'numerica' : null }, c.titulo)))),
        h('tbody', {}, cuerpo),
      ),
    ),
  )
}
