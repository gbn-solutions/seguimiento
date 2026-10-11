// El repo privado de datos, visto como un almacén de archivos JSON.
// Todo pasa por la API de contenidos de GitHub; el permiso lo da el token de cada socio.

import { serializar, validarProyecto } from './modelo.js'

const API = 'https://api.github.com'
const INTENTOS = 4

export class ErrorDeGitHub extends Error {
  constructor(mensaje, estado, opciones) {
    super(mensaje, opciones)
    this.estado = estado
  }
}

const MENSAJES = {
  401: 'GitHub rechazó el token. Revisa que esté bien copiado y que no haya vencido.',
  403: 'El token no tiene permiso sobre el repo de datos, o GitHub limitó las solicitudes por un rato.',
  404: 'No se encontró el repo o el archivo. Revisa el nombre del repo y que el token tenga acceso a él.',
  409: 'Alguien guardó al mismo tiempo. Vuelve a intentarlo.',
  422: 'GitHub no aceptó el cambio. Si estabas creando un proyecto, puede que ya exista.',
}

export function aBase64(texto) {
  const bytes = new TextEncoder().encode(texto)
  let binario = ''
  for (const byte of bytes) binario += String.fromCharCode(byte)
  return btoa(binario)
}

export function desdeBase64(base64) {
  const binario = atob(base64.replace(/\s/g, ''))
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binario, (c) => c.charCodeAt(0)))
}

export function crearAlmacen({ dueno, repo, token, carpeta = 'proyectos', pedir = (...a) => fetch(...a) }) {
  // Un token con espacios o símbolos raros haría fallar la solicitud con un error de red engañoso.
  if (!/^[\x21-\x7e]+$/.test(token)) {
    throw new ErrorDeGitHub('El token tiene espacios o caracteres que no corresponden. Cópialo de nuevo.', 0)
  }
  const base = `${API}/repos/${encodeURIComponent(dueno)}/${encodeURIComponent(repo)}`
  const url = (ruta) => (ruta === null ? base : `${base}/contents/${ruta}`)
  const archivo = (nombre) => `${carpeta}/${encodeURIComponent(nombre)}.json`

  async function llamar(ruta, opciones = {}) {
    let respuesta
    try {
      respuesta = await pedir(url(ruta), {
        ...opciones,
        cache: 'no-store',
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })
    } catch (causa) {
      throw new ErrorDeGitHub('No hay conexión con GitHub. Revisa la red y vuelve a intentarlo.', 0, { cause: causa })
    }
    if (!respuesta.ok) {
      throw new ErrorDeGitHub(MENSAJES[respuesta.status] ?? `GitHub respondió ${respuesta.status}.`, respuesta.status)
    }
    return respuesta.json()
  }

  async function listar() {
    try {
      const entradas = await llamar(carpeta)
      return entradas
        .filter((e) => e.type === 'file' && e.name.endsWith('.json'))
        .map((e) => e.name.slice(0, -'.json'.length))
        .sort()
    } catch (error) {
      if (error.estado !== 404) throw error
      // GitHub responde 404 tanto si falta la carpeta como si el repo no existe o el
      // token no lo ve. Solo lo primero es una lista vacía: se pregunta por el repo.
      await llamar(null)
      return []
    }
  }

  async function leer(nombre) {
    const respuesta = await llamar(archivo(nombre))
    if (respuesta.encoding !== 'base64') {
      throw new ErrorDeGitHub(`El archivo de «${nombre}» es demasiado grande para leerlo desde la página.`, 0)
    }
    let datos
    try {
      datos = JSON.parse(desdeBase64(respuesta.content))
    } catch {
      throw new ErrorDeGitHub(`El archivo de «${nombre}» no es JSON válido. Hay que repararlo a mano en el repo.`, 0)
    }
    return { datos: validarProyecto(datos), sha: respuesta.sha }
  }

  async function escribir(nombre, datos, mensaje, sha) {
    const cuerpo = { message: mensaje, content: aBase64(serializar(datos)), ...(sha ? { sha } : {}) }
    const respuesta = await llamar(archivo(nombre), { method: 'PUT', body: JSON.stringify(cuerpo) })
    return respuesta.content.sha
  }

  async function crear(nombre, datos) {
    await escribir(nombre, datos, `Crea el proyecto ${nombre}`)
    return datos
  }

  // Lee la última versión, le aplica el cambio y la guarda. Si otro socio guardó
  // entre medio, GitHub responde 409 y se repite sobre la versión nueva: el cambio
  // de cada uno se aplica encima del del otro, nadie pisa a nadie.
  async function cambiar(nombre, mutacion, mensaje) {
    for (let intento = 1; ; intento += 1) {
      const { datos, sha } = await leer(nombre)
      const nuevos = mutacion(datos)
      try {
        await escribir(nombre, nuevos, mensaje, sha)
        return nuevos
      } catch (error) {
        if (error.estado !== 409 || intento >= INTENTOS) throw error
      }
    }
  }

  return { listar, leer, crear, cambiar }
}
