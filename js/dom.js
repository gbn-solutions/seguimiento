// Ayudas mínimas para construir la pantalla. Todo texto entra por `textContent`:
// lo que escriben los socios nunca se interpreta como HTML.

export function h(etiqueta, atributos = {}, ...hijos) {
  const nodo = document.createElement(etiqueta)
  for (const [clave, valor] of Object.entries(atributos ?? {})) {
    if (valor === null || valor === undefined || valor === false) continue
    if (clave.startsWith('on')) nodo.addEventListener(clave.slice(2).toLowerCase(), valor)
    else if (clave === 'class') nodo.className = valor
    else if (clave === 'value') nodo.value = valor
    else if (valor === true) nodo.setAttribute(clave, '')
    else nodo.setAttribute(clave, String(valor))
  }
  for (const hijo of hijos.flat()) {
    if (hijo === null || hijo === undefined || hijo === false) continue
    nodo.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)))
  }
  return nodo
}

const pesos = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const decimales = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const SIN_DATO = '–'

export const moneda = (v) => (typeof v === 'number' ? `$ ${pesos.format(Math.round(v))}` : SIN_DATO)
export const horas = (v) => (typeof v === 'number' ? `${decimales.format(v)} h` : SIN_DATO)
export const numero = (v) => (typeof v === 'number' ? decimales.format(v) : SIN_DATO)
export const porcentaje = (v) => (typeof v === 'number' ? `${Math.round(v * 100)}%` : SIN_DATO)

// Las fechas se guardan como AAAA-MM-DD y se muestran como DD/MM/AAAA.
export function fecha(v) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v ?? '')
  return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : SIN_DATO
}

export const hoy = () => {
  const d = new Date()
  const dos = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`
}
