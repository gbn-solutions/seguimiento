import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aBase64, crearAlmacen, desdeBase64, ErrorDeGitHub } from '../js/github.js'
import { serializar } from '../js/modelo.js'
import { ejemplo } from './ejemplo.js'

const respuesta = (status, cuerpo) => ({ ok: status < 300, status, json: async () => cuerpo })

// Un GitHub de mentira: un archivo por ruta, con un sha que cambia en cada escritura.
function githubFalso(archivos = {}) {
  const estado = { archivos: { ...archivos }, version: 1, llamadas: [], antesDeEscribir: null }
  const pedir = async (url, opciones) => {
    if (!url.includes('/contents/')) return respuesta(estado.sinRepo ? 404 : 200, {})
    const ruta = decodeURIComponent(url.split('/contents/')[1])
    estado.llamadas.push({ metodo: opciones.method ?? 'GET', ruta, opciones })
    if ((opciones.method ?? 'GET') === 'GET') {
      if (ruta === 'proyectos') {
        const nombres = Object.keys(estado.archivos)
        if (!nombres.length) return respuesta(404, {})
        return respuesta(200, [...nombres.map((n) => ({ type: 'file', name: n.split('/')[1] })), { type: 'dir', name: 'viejo' }, { type: 'file', name: 'LEEME.md' }])
      }
      const actual = estado.archivos[ruta]
      return actual ? respuesta(200, { content: actual.content, sha: actual.sha, encoding: 'base64' }) : respuesta(404, {})
    }
    if (estado.antesDeEscribir) {
      const intruso = estado.antesDeEscribir
      estado.antesDeEscribir = null
      intruso(estado)
    }
    const cuerpo = JSON.parse(opciones.body)
    const actual = estado.archivos[ruta]
    if (actual && !cuerpo.sha) return respuesta(422, {})
    if (actual && cuerpo.sha !== actual.sha) return respuesta(409, {})
    estado.version += 1
    estado.archivos[ruta] = { content: cuerpo.content, sha: `sha${estado.version}`, mensaje: cuerpo.message }
    return respuesta(200, { content: { sha: `sha${estado.version}` } })
  }
  return { estado, pedir }
}

const guardado = (datos, sha = 'sha1') => ({ content: aBase64(serializar(datos)), sha, encoding: 'base64' })
const almacenCon = (falso) => crearAlmacen({ dueno: 'org', repo: 'datos', token: 'secreto', pedir: falso.pedir })
const contenido = (falso, ruta) => JSON.parse(desdeBase64(falso.estado.archivos[ruta].content))

test('el base64 conserva tildes, eñes y símbolos', () => {
  const texto = 'Café Ñandú · $ 5.000 — «listo» ✓'
  assert.equal(desdeBase64(aBase64(texto)), texto)
  assert.equal(desdeBase64('Q2Fm\nw6k=\n'), 'Café')
})

test('cada solicitud lleva el token y evita la caché del navegador', async () => {
  const falso = githubFalso({ 'proyectos/demo.json': guardado(ejemplo) })
  await almacenCon(falso).leer('demo')
  const { opciones } = falso.estado.llamadas[0]
  assert.equal(opciones.headers.Authorization, 'Bearer secreto')
  assert.equal(opciones.cache, 'no-store')
})

test('listar devuelve solo los proyectos, y un repo vacío es una lista vacía', async () => {
  const falso = githubFalso({ 'proyectos/zeta.json': guardado(ejemplo), 'proyectos/alfa.json': guardado(ejemplo) })
  assert.deepEqual(await almacenCon(falso).listar(), ['alfa', 'zeta'])
  assert.deepEqual(await almacenCon(githubFalso()).listar(), [])
})

test('un repo mal escrito o sin acceso no se confunde con uno vacío', async () => {
  const falso = githubFalso()
  falso.estado.sinRepo = true
  await assert.rejects(almacenCon(falso).listar(), /No se encontró/)
})

test('un token con espacios se rechaza antes de llamar a GitHub', () => {
  assert.throws(() => crearAlmacen({ dueno: 'o', repo: 'r', token: 'abc def' }), /caracteres/)
  assert.throws(() => crearAlmacen({ dueno: 'o', repo: 'r', token: '' }), /caracteres/)
})

test('un archivo demasiado grande o con bytes inválidos se informa', async () => {
  const grande = githubFalso({ 'proyectos/demo.json': { content: '', sha: 'sha1', encoding: 'none' } })
  grande.pedir = async () => respuesta(200, { content: '', sha: 'sha1', encoding: 'none' })
  await assert.rejects(almacenCon(grande).leer('demo'), /demasiado grande/)
  const invalido = async () => respuesta(200, { content: btoa('\xff\xfe{'), sha: 'sha1', encoding: 'base64' })
  await assert.rejects(crearAlmacen({ dueno: 'o', repo: 'r', token: 't', pedir: invalido }).leer('demo'), /no es JSON válido/)
})

test('leer entrega el proyecto validado', async () => {
  const falso = githubFalso({ 'proyectos/demo.json': guardado(ejemplo) })
  const { datos, sha } = await almacenCon(falso).leer('demo')
  assert.deepEqual(datos, ejemplo)
  assert.equal(sha, 'sha1')
})

test('un archivo roto se informa en vez de calcular con basura', async () => {
  const roto = githubFalso({ 'proyectos/demo.json': { content: aBase64('{no es json'), sha: 'sha1', encoding: 'base64' } })
  await assert.rejects(almacenCon(roto).leer('demo'), /no es JSON válido/)
  const ajeno = githubFalso({ 'proyectos/demo.json': { content: aBase64('{"version":1}'), sha: 'sha1', encoding: 'base64' } })
  await assert.rejects(almacenCon(ajeno).leer('demo'), /lista/)
})

test('crear escribe el archivo y no pisa uno existente', async () => {
  const falso = githubFalso()
  await almacenCon(falso).crear('nuevo', ejemplo)
  assert.deepEqual(contenido(falso, 'proyectos/nuevo.json'), ejemplo)
  await assert.rejects(almacenCon(falso).crear('nuevo', ejemplo), (e) => e instanceof ErrorDeGitHub && e.estado === 422)
})

test('cambiar aplica la mutación sobre la última versión y la guarda', async () => {
  const falso = githubFalso({ 'proyectos/demo.json': guardado(ejemplo) })
  const nuevos = await almacenCon(falso).cambiar('demo', (d) => ({ ...d, etapas: ['Una'] }), 'Cambia etapas')
  assert.deepEqual(nuevos.etapas, ['Una'])
  assert.deepEqual(contenido(falso, 'proyectos/demo.json').etapas, ['Una'])
  assert.equal(falso.estado.archivos['proyectos/demo.json'].mensaje, 'Cambia etapas')
})

test('si otro socio guardó entre medio, el cambio se reaplica sobre lo suyo', async () => {
  const falso = githubFalso({ 'proyectos/demo.json': guardado(ejemplo) })
  falso.estado.antesDeEscribir = (estado) => {
    estado.archivos['proyectos/demo.json'] = guardado({ ...ejemplo, etapas: ['Del otro socio'] }, 'shaX')
  }
  const nuevos = await almacenCon(falso).cambiar('demo', (d) => ({ ...d, socios: [] }), 'Quita socios')
  assert.deepEqual(nuevos.etapas, ['Del otro socio'])
  assert.deepEqual(nuevos.socios, [])
  assert.equal(falso.estado.llamadas.filter((l) => l.metodo === 'PUT').length, 2)
})

test('los conflictos sin fin terminan en error en vez de un bucle', async () => {
  const pedir = async (url, opciones) =>
    opciones.method === 'PUT' ? respuesta(409, {}) : respuesta(200, guardado(ejemplo))
  const almacen = crearAlmacen({ dueno: 'o', repo: 'r', token: 't', pedir })
  await assert.rejects(almacen.cambiar('demo', (d) => d, 'x'), (e) => e.estado === 409)
})

test('los errores de GitHub y de red llegan con un mensaje entendible', async () => {
  const con = (pedir) => crearAlmacen({ dueno: 'o', repo: 'r', token: 't', pedir })
  await assert.rejects(con(async () => respuesta(401, {})).leer('demo'), /rechazó el token/)
  await assert.rejects(con(async () => respuesta(404, {})).leer('demo'), /No se encontró/)
  await assert.rejects(con(async () => respuesta(500, {})).listar(), /respondió 500/)
  await assert.rejects(
    con(async () => {
      throw new TypeError('Failed to fetch')
    }).listar(),
    /No hay conexión/,
  )
})
