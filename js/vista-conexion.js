// La pantalla que se ve antes de conectar: pide el token de GitHub y explica cómo crearlo.

import { h } from './dom.js'

const URL_TOKEN = 'https://github.com/settings/personal-access-tokens/new'

export function vistaConexion({ config, error, alConectar }) {
  const formulario = h(
    'form',
    { class: 'formulario panel conexion' },
    h('h2', {}, 'Conectar con los datos'),
    h('p', {}, 'Esta página no contiene datos. Los proyectos viven en un repo privado de GitHub y solo los ve quien tenga acceso a él.'),
    h(
      'ol',
      { class: 'pasos' },
      h('li', {}, 'Abre ', h('a', { href: URL_TOKEN, target: '_blank', rel: 'noopener noreferrer' }, 'la creación de tokens de GitHub'), ' (token de acceso detallado).'),
      h('li', {}, 'En «Resource owner» elige la organización dueña del repo de datos.'),
      h('li', {}, 'En «Repository access» elige «Only select repositories» y marca solo el repo de datos.'),
      h('li', {}, 'En «Permissions → Repository permissions» da a «Contents» acceso de lectura y escritura. Nada más.'),
      h('li', {}, 'Genera el token y pégalo aquí.'),
    ),
    h(
      'div',
      { class: 'campos' },
      h('label', { class: 'campo' }, h('span', {}, 'Organización o usuario'), h('input', { type: 'text', name: 'dueno', value: config.dueno, required: true, autocomplete: 'off' })),
      h('label', { class: 'campo' }, h('span', {}, 'Repo de datos'), h('input', { type: 'text', name: 'repo', value: config.repo, required: true, autocomplete: 'off' })),
      h('label', { class: 'campo campo-ancho' }, h('span', {}, 'Token'), h('input', { type: 'password', name: 'token', value: config.token, required: true, autocomplete: 'off', spellcheck: 'false' })),
    ),
    h('p', { class: 'tenue' }, 'El token queda guardado solo en este navegador y se envía únicamente a api.github.com. No lo uses en un computador compartido.'),
    error ? h('p', { class: 'aviso aviso-error', role: 'alert' }, error) : null,
    h('div', { class: 'acciones' }, h('span', { class: 'espacio' }), h('button', { type: 'submit', class: 'boton boton-principal' }, 'Conectar')),
  )
  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault()
    const valor = (nombre) => formulario.elements.namedItem(nombre).value.trim()
    alConectar({ dueno: valor('dueno'), repo: valor('repo'), token: valor('token') })
  })
  return formulario
}
