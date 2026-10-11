# Seguimiento y costeo

Una página para llevar las tareas, las horas y los gastos de un proyecto, y ver su costo y su
margen. Reemplaza a una planilla por proyecto: todas las fórmulas viven acá.

**Este repo es público y no contiene datos.** Los proyectos viven en un repo privado aparte, un
archivo JSON por proyecto. La página los lee y los escribe con la API de GitHub, usando el token de
quien la abre: solo ve datos quien tiene acceso a ese repo.

## Usarla

1. Abrir la página publicada en GitHub Pages.
2. Crear un token de acceso detallado en GitHub, limitado al repo de datos y con permiso de
   lectura y escritura sobre «Contents». La pantalla de conexión trae los pasos.
3. Pegar el token. Queda guardado solo en ese navegador.

Cada cambio se guarda como un commit en el repo de datos, a nombre de quien lo hizo. Si dos
personas guardan a la vez cosas distintas, el segundo cambio se aplica encima del primero. Si
las dos editaron el mismo registro, la segunda recibe un aviso y nada se pisa.

## Seguridad

- El token se guarda en el `localStorage` del navegador y solo viaja a `api.github.com`.
- Todas las páginas de GitHub Pages de una misma organización comparten origen, y por lo tanto
  `localStorage`. Otra página publicada bajo la misma organización podría leer el token: no
  publicar ahí sitios que no sean de confianza, o mover esta página a un dominio propio.
- Por eso el token debe ser de acceso detallado, limitado al repo de datos y solo con permiso
  sobre «Contents». Si se filtra, se revoca en GitHub y no da acceso a nada más.
- No usar la página en un computador compartido; «Desconectar» borra el token del navegador.

## Un proyecto nuevo

«Nuevo proyecto» crea el archivo. Puede copiar los socios, las tarifas y las etapas del proyecto
abierto, así que replicar la forma de trabajo es un clic.

## Cómo está armado

| Archivo | Qué hace |
| --- | --- |
| `js/calculo.js` | Las fórmulas: costo por tarea, avance, datos que faltan, margen. Funciones puras. |
| `js/modelo.js` | La forma de un proyecto y las operaciones que lo cambian. |
| `js/github.js` | Lectura y escritura en el repo de datos, con reintento ante guardados simultáneos. |
| `js/campos.js` | Qué pregunta cada formulario y qué muestra cada tabla. |
| `js/app.js` y `js/vista-*.js` | La pantalla. |

No hay paso de compilación ni dependencias: son módulos que el navegador carga tal cual.

## Probar

```
npm test
```

Las pruebas usan datos inventados (`test/ejemplo.js`) y un GitHub simulado en memoria.

## Formato de los datos

`proyectos/<nombre>.json` en el repo de datos:

```
{
  "version": 1,
  "proyecto": { "nombre", "cliente", "empresa" },
  "precios":  { "cobroInicial", "mensualidad", "iva", "horizonteMeses" },
  "socios":   [{ "nombre", "tarifa" }],
  "etapas":   ["..."],
  "tareas":   [{ "id", "etapa", "tarea", "responsable", "estado", "horasPrevistas", "cuentaAvance", "tipoCosto", ... }],
  "horas":    [{ "id", "fecha", "tarea", "socio", "calidad", "horas" }],
  "gastos":   [{ "id", "concepto", "frecuencia", "pagador", "incluir", "cantidad", "unitarioPrevisto", ... }]
}
```

Los montos son netos. Las fechas van como `AAAA-MM-DD`.
