# Plan: app responsive + arreglo del tooltip del donut

## Contexto

La app es un único `app/globals.css` (247 líneas) con clases semánticas, sin Tailwind ni CSS
modules. En todo el repo hay **dos** `@media`: el de `prefers-color-scheme` y un único breakpoint
`max-width: 820px` que colapsa `.dash` a una columna. Todo lo demás está construido con anchos fijos
en px pensados para un viewport de escritorio de ~1100px, así que por debajo de ~700px la app se
rompe: columnas de tabla bloqueadas, rejillas que nunca colapsan, desbordamiento horizontal y
objetivos táctiles de 28–36px.

Además hay un bug de escritorio concreto: al pasar el ratón por una porción del donut, el tooltip
queda tapado por el total del centro. `.donut-center` y `.recharts-tooltip-wrapper` son ambos
posicionados con `z-index: auto` dentro de `.donut-wrap`; como el overlay del centro va **después**
en el DOM ([Dashboard.tsx:88-94](components/Dashboard.tsx#L88-L94)), gana el orden de pintado y
cubre el tooltip cuando este cae sobre el agujero del donut — que con `innerRadius={95}` es
exactamente donde Recharts lo coloca a menudo.

Resultado buscado: que la app se vea impecable de 320px a 4K, conservando la identidad visual
actual, con navegación inferior en móvil, filas de edición apiladas, selector de tema claro/oscuro
y el tooltip siempre por encima.

## Decisiones ya tomadas con el usuario

- Navegación móvil: **barra inferior fija** con las 6 secciones.
- Editor en móvil: **filas apiladas tipo tarjeta**, sin scroll horizontal.
- Alcance visual: **pulido sobre el diseño actual**, no rediseño de identidad.
- Tema: **selector manual claro / oscuro / auto**.

## Estrategia

Mantener el enfoque actual (un CSS global, clases semánticas) — introducir Tailwind sería un
rediseño encubierto y no aporta nada aquí. Sobre esa base:

1. **Sistema de escalas fluidas** en `:root`, junto a los tokens existentes: escala de espaciado
   (`--sp-1..--sp-6`), escala tipográfica con `clamp()` (`--fs-sm`, `--fs-body`, `--fs-h1`,
   `--fs-display`) y `--tap: 44px`. Se sustituyen los literales `1.25rem` / `0.75rem` repetidos por
   los tokens, para que el ritmo vertical se comprima solo en pantallas pequeñas.
2. **Breakpoints únicos y explícitos**, declarados una vez en un bloque comentado al final del CSS:
   `560px` (móvil), `820px` (tablet, ya existe), `1200px` (ancho amplio). Nada de breakpoints
   ad-hoc dispersos.
3. **Mobile-first en lo nuevo**: cada rejilla rígida pasa a `grid-template-columns:
   repeat(auto-fit, minmax(...))` o a apilado por defecto con columnas a partir de `820px`.

## Cambios por área

### 1. Bug del tooltip (independiente del resto, se puede hacer primero)

- `components/Dashboard.tsx:82-85` y `components/AssetClasses.tsx:54-57`: añadir
  `wrapperStyle={{ zIndex: 30, pointerEvents: "none" }}` al `<Tooltip>`.
- `app/globals.css:125`: dar a `.donut-center` un `z-index: 1` explícito para fijar el orden
  (queda sobre el SVG, bajo el tooltip) en lugar de depender del orden del DOM.
- Aprovechar para mejorar la legibilidad del tooltip: `allowEscapeViewBox={{ x: false, y: true }}`
  evita que se recorte arriba en donuts altos.
- El `tooltipStyle` compartido ([Dashboard.tsx:8-14](components/Dashboard.tsx#L8-L14)) se amplía con
  `boxShadow: "var(--shadow)"` y `padding`; lo consumen los tres gráficos, así que un solo cambio.

### 2. Shell y navegación — `components/WealthApp.tsx`, `app/globals.css:48-75`

- Extraer `TABS` a un componente `components/TabNav.tsx` reutilizado por el header de escritorio y
  la barra inferior, para no duplicar la lista.
- Escritorio (≥820px): igual que ahora.
- Móvil (<820px): `.tabs` del header se oculta; se renderiza `<nav class="tabbar">` fija abajo con
  `position: fixed; bottom: 0`, `padding-bottom: env(safe-area-inset-bottom)` (notch iOS), rejilla
  de 6 columnas iguales, icono sobre etiqueta, altura mínima `var(--tap)`. `.app` recibe
  `padding-bottom` suficiente para que el contenido no quede debajo.
- Header móvil: marca + total en una línea, `.session-email` oculto (queda accesible desde el menú
  de "Salir"), tamaños vía `clamp()`. Con esto el sticky header deja de ocupar media pantalla.
- `.btn`, `.tab`, `.input`, `select`: `min-height: var(--tap)` bajo `820px`. Esto elimina el
  problema de objetivos de 28px del `.btn.sm`.

### 3. Tema claro/oscuro/auto

- `app/layout.tsx`: añadir `export const viewport` con `width=device-width, initialScale=1,
  viewportFit: "cover"` (hoy es implícito y hace falta el `viewport-fit` para el safe-area), y un
  script inline mínimo en `<head>` que lea `localStorage.theme` y ponga `data-theme` en `<html>`
  **antes** del primer pintado, para evitar el flash de tema incorrecto.
- `app/globals.css`: la paleta clara vive en `:root` a secas; el bloque
  `@media (prefers-color-scheme: dark)` pasa a `:root:not([data-theme="light"])` dentro del media, y
  se añade un `:root[data-theme="dark"]` con los mismos tokens, para que el selector gane en ambos
  sentidos.
- `components/ThemeToggle.tsx` (nuevo, cliente): ciclo auto → claro → oscuro, escribe `data-theme` y
  `localStorage`, se coloca en `.session`.
- Colorear los gráficos con el tema: `PALETTE` y `ASSET_CLASSES` en
  [lib/utils.ts:31-38](lib/utils.ts#L31-L38) son colores fijos pensados para fondo claro. En vez de
  duplicar paletas, aplicar `filter: saturate(0.9) brightness(1.15)` al `<svg>` de Recharts en modo
  oscuro, y sustituir los `#2a78d6` incrustados de
  [Evolution.tsx:69-94](components/Evolution.tsx#L69-L94) por `var(--accent)`.

### 4. Dashboard y Clases — `.donut-wrap`, `.legend-row`

- Donut fluido: sustituir `innerRadius={95} outerRadius={140}` fijos por porcentajes
  (`innerRadius="62%" outerRadius="92%"`) y la altura fija `360` por una altura por breakpoint
  (`260` móvil / `360` escritorio) mediante una constante local; así el donut respira a 320px.
- `.donut-value` con `clamp()` para que "1.234.567,89 €" no desborde el agujero en móvil.
- `.legend-row`: hoy `auto 1fr 90px auto 52px`. Pasa a dos líneas bajo `560px` — swatch + nombre en
  la primera, barra + valor + porcentaje en la segunda — y la barra de 90px pasa a `minmax(48px,
  1fr)`. Se toca solo el CSS: el marcado de Dashboard y AssetClasses ya comparte las mismas clases.

### 5. Editor — `components/Editor.tsx:81-87,114-169` + CSS

Es el cambio con más sustancia. La `<table className="sub-table">` con `.class-cell{width:150px}`,
`.amount-cell{width:160px}` y `.row-actions{width:40px}` bloquea 350px.

- Convertir la tabla en una lista de `<div role="row">` con CSS Grid (ya hay un `display:flex` sobre
  un `<td>` en `.amount-cell`, o sea que la semántica de tabla ya estaba rota). Escritorio:
  `grid-template-columns: 1fr 150px 160px 40px`, idéntico a hoy. Móvil (<560px): dos filas —
  `"name name" / "class amount action"` vía `grid-template-areas`.
- `.editor-add` y `.sub-add` pasan a `flex-wrap: wrap` con `flex: 1 1 12rem` en los inputs.
- Quitar `min-width: 240px` de `.snap-create-row .input` (desborda por debajo de 330px) y
  sustituirlo por `flex: 1 1 240px`.

### 6. Snapshots, Comparar, Evolución

- `Snapshots.tsx:47-97`: envolver `.hist-table` en `.table-scroll { overflow-x: auto;
  -webkit-overflow-scrolling: touch }` y, bajo `560px`, acortar la fecha usando una variante corta
  de `fmtDate` ([lib/utils.ts:12-19](lib/utils.ts#L12-L19)) — reutilizar la función existente
  añadiendo un parámetro, no crear otra.
- `Compare.tsx`: `.cmp-total` de `1fr 1fr 1.3fr` a `repeat(auto-fit, minmax(140px, 1fr))`, con
  `border-left` del `.big` convertido en `border-top` cuando está apilado. `.cmp-sub` y `.cmp-nums`
  con `flex-wrap: wrap`; bajo `560px` los dos importes y la delta pasan a segunda línea.
- `Evolution.tsx:65-84`: `YAxis width={80}` → `width` reducido en móvil y `tickFormatter` compacto
  ("1,2 M"); `<XAxis interval="preserveStartEnd" minTickGap={24}>` para que las fechas dejen de
  solaparse. `.evo-head` con `flex-wrap: wrap`.

### 7. Accesibilidad y detalles finales

- `:focus-visible` con anillo consistente en `.btn`, `.tab`, `.legend-row.clickable` (hoy solo
  `.input` tiene foco visible).
- `.login-wrap`: `100vh` → `100dvh`.
- `@media (prefers-reduced-motion: reduce)` desactivando las transiciones existentes.
- `aria-current="page"` en la pestaña activa y `aria-label` en los botones de borrar (`✕`).

## Archivos que se tocan

| Archivo | Cambio |
|---|---|
| [app/globals.css](app/globals.css) | El grueso: tokens fluidos, breakpoints, tabbar, rejillas, foco |
| [app/layout.tsx](app/layout.tsx) | `viewport` export + script anti-flash de tema |
| [components/WealthApp.tsx](components/WealthApp.tsx) | Header compacto, `<TabNav>`, tabbar inferior, `<ThemeToggle>` |
| `components/TabNav.tsx`, `components/ThemeToggle.tsx` | Nuevos |
| [components/Dashboard.tsx](components/Dashboard.tsx), [components/AssetClasses.tsx](components/AssetClasses.tsx) | Tooltip z-index, radios en %, altura por breakpoint |
| [components/Editor.tsx](components/Editor.tsx) | Tabla → rejilla apilable |
| [components/Snapshots.tsx](components/Snapshots.tsx), [components/Compare.tsx](components/Compare.tsx), [components/Evolution.tsx](components/Evolution.tsx) | Envoltorio de scroll, rejillas fluidas, ejes |
| [lib/utils.ts](lib/utils.ts) | `fmtDate` con variante corta; `fmt` compacto para ejes |

## Verificación

1. `npm test` y `npm run build` — deben seguir en verde (24 tests; no hay tests de DOM, así que el
   riesgo de regresión lógica se limita a `fmtDate`/`fmt`, que sí tienen cobertura en
   [tests/utils.test.ts](tests/utils.test.ts); añadir casos para la variante corta).
2. `npm run dev` y revisar cada una de las 6 pestañas en 320, 390, 768, 1024 y 1440px, comprobando
   en cada ancho que `document.documentElement.scrollWidth === clientWidth` (cero scroll
   horizontal).
3. Bug del tooltip: en escritorio, pasar el ratón por varias porciones del donut en Resumen y en
   Clases, incluidas las que sitúan el tooltip sobre el centro — la etiqueta debe quedar siempre
   encima del total.
4. Tema: recargar con el sistema en oscuro y en claro para confirmar que no hay flash, y ciclar el
   selector comprobando que persiste tras recargar.
5. Táctil: verificar en las DevTools que ningún control interactivo baja de 44×44 en móvil.
