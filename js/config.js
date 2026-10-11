// Dónde viven los datos por omisión y cómo se recuerda la conexión en este navegador.
// El token nunca sale de acá salvo hacia api.github.com.

export const POR_OMISION = Object.freeze({ dueno: 'gbn-solutions', repo: 'seguimiento-datos', token: '' })

const CLAVE_CONFIG = 'seguimiento.config'
const CLAVE_ULTIMO = 'seguimiento.ultimo'

function leer(clave) {
  try {
    return localStorage.getItem(clave)
  } catch {
    // Navegación privada o almacenamiento bloqueado: se sigue sin recordar nada.
    return null
  }
}

function escribir(clave, valor) {
  try {
    if (valor === null) localStorage.removeItem(clave)
    else localStorage.setItem(clave, valor)
    return true
  } catch {
    return false
  }
}

export function leerConfig() {
  try {
    const guardada = JSON.parse(leer(CLAVE_CONFIG) ?? '{}')
    return { ...POR_OMISION, ...(guardada && typeof guardada === 'object' ? guardada : {}) }
  } catch {
    return { ...POR_OMISION }
  }
}

export const guardarConfig = (config) => escribir(CLAVE_CONFIG, JSON.stringify(config))
export const olvidarConfig = () => escribir(CLAVE_CONFIG, null)
export const leerUltimo = () => leer(CLAVE_ULTIMO)
export const guardarUltimo = (nombre) => escribir(CLAVE_ULTIMO, nombre)
