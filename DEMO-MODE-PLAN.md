# Plan: Modo Demo con catálogo de perfiles + icono de marca
## Contexto

Hoy `/login` solo ofrece "Entrar con Google" ([app/login/page.tsx:45-54](app/login/page.tsx#L45-L54)), así
que nadie puede ver la app sin ceder una cuenta real. Falta una puerta de entrada que enseñe el
producto funcionando y con datos que merezcan la pena mirar. Además la app no tiene icono: no existe
`public/`, ni `app/icon.*`, ni `favicon.ico`, y `metadata` ([app/layout.tsx:8-11](app/layout.tsx#L8-L11))
no declara `icons`, así que la pestaña del navegador muestra el icono roto por defecto.

Resultado buscado: un botón de modo demo que abra un **catálogo de perfiles de inversor**, desde el
patrimonio de un trabajador por cuenta ajena hasta el de un fundador tecnológico, cada uno con
entidades e instrumentos **reales** (ISIN, TER, bancos y brókeres que existen) y con histórico de
snapshots, para que las 6 pestañas tengan algo sustancioso que mostrar. Y un icono de marca derivado
del punto degradado que ya usa la cabecera.

## Decisiones tomadas con el usuario

- Cada visitante recibe **su propia copia** de la cartera demo y puede editarla; se descarta al salir.
- **Varios perfiles a elegir**, de escalas muy distintas, para que resulte realista.
- Icono: evolución del punto de marca actual → anillo tipo donut con degradado azul→verde.

### Restricción innegociable sobre las personas

Los perfiles son **personajes ficticios con nombres inventados**. No se atribuyen carteras, cifras ni
registros financieros a personas reales (Buffett, Musk o cualquier otra): eso sería fabricar
documentación falsa sobre alguien identificable. Lo que sí es real —y es donde está el valor— son los
**instrumentos**: fondos, ETFs, ISIN, TER, bancos y brókeres. Cada perfil lleva un rótulo visible de
"Perfil ficticio con fines demostrativos".

## Arquitectura

El descubrimiento clave es que **no hace falta tocar el aislamiento de datos**. `requireSession()`
([lib/auth.ts](lib/auth.ts)) deriva `userId` de `normalizeEmail(session.user.email)`, y
`wealthService` particiona por `userPk(userId)`. Si la sesión demo lleva un email sintético, todo lo
demás —lectura, escritura, snapshots, bloqueo optimista— funciona sin cambios y con las mismas
garantías de aislamiento.

Formato del identificador: `demo+<perfil>+<nonce>@mipatrimonio.demo`, con `nonce` aleatorio por
sesión. De ahí sale la copia privada por visitante, sin código nuevo de multi-tenancy.

### 1. Proveedor de credenciales demo — `auth.config.ts`

Añadir un `Credentials` de `next-auth/providers/credentials` (JS puro, cumple la regla de edge-safety
documentada en [auth.config.ts:4-6](auth.config.ts#L4-L6): no arrastra `@aws-sdk/*`). Su `authorize`
valida que `profileId` esté en el catálogo y devuelve `{ id, email: <email sintético>, name: <nombre
del personaje> }`. La sesión sigue siendo JWT, que es justo lo que exige `Credentials`.

Tres retoques en los callbacks:

- **`signIn` ([auth.config.ts:47-51](auth.config.ts#L47-L51)) — el fallo más probable de toda la
  tarea**: hoy lee `profile`, que es `undefined` para credenciales, y devolvería `no-email`. Hay que
  ramificar por `account?.provider === "demo"` y dejar pasar.
- **`jwt`**: propagar `token.demo = true` y `token.demoProfile = <id>`.
- **`session`**: reexponer ambos, y declararlos en [types/next-auth.d.ts](types/next-auth.d.ts) junto
  a `googleSub`.

`authorized` no se toca: `Boolean(auth?.user)` ya deja pasar la sesión demo.

### 2. Catálogo de perfiles — `lib/demo/`

- `lib/demo/profiles.ts`: metadatos (id, nombre del personaje, titular, patrimonio aproximado,
  descripción de una línea, emoji). Es lo único que importa la pantalla de login, y **no puede
  importar `@/lib/services/*`**, porque `auth.config.ts` lo consume desde el Edge.
- `lib/demo/data/<id>.ts`: un fichero por perfil con `{ groups, snapshots }` en la forma que ya
  validan `groupsSchema` y `snapshotSchema` ([lib/types.ts:29-52](lib/types.ts#L29-L52)). Se cargan
  con `import()` dinámico solo en el servidor, al sembrar.
- Los `assetClass` van **explícitos** en cada partida: la heurística de
  [lib/utils.ts](lib/utils.ts) es solo red de seguridad, y aquí queremos control total del reparto
  por clases, que es lo que luce la pestaña Clases.

### 3. Siembra — `lib/services/demoService.ts` + `app/api/data/route.ts`

`GET /api/data` ya es el único sitio que llama a `ensureUser` ([app/api/data/route.ts:16](app/api/data/route.ts#L16)),
así que es el punto natural: si el `userId` es demo y la cartera viene vacía, sembrar y releer.
Idempotente, y funciona igual con DynamoDB que con el almacén en memoria de
[lib/services/wealthService.ts:35-54](lib/services/wealthService.ts#L35-L54) (modo sin AWS).

La siembra reutiliza las funciones existentes: `savePortfolio(userId, groups)` y un `createSnapshot`
por cada snapshot del fixture. **No se escribe a DynamoDB directamente desde el código demo.**

**Caducidad de los datos demo.** Cada visitante crea una partición nueva, así que sin limpieza la
tabla crece sin límite. Solución: atributo `ttl` (epoch, 24 h) en los ítems de las particiones demo.

- `infra/dynamodb.yml`: añadir `TimeToLiveSpecification` con `AttributeName: ttl`, `Enabled: true`.
- `lib/services/wealthService.ts`: un helper local `demoTtl(userId)` que devuelve el epoch para ids
  demo y `undefined` para el resto, aplicado en `ensureUser`, `savePortfolio` y `createSnapshot`. Es
  el único cambio en ese fichero y no toca ninguna de las cuatro invariantes de su cabecera.

### 4. Pantalla de login — `app/login/page.tsx`

Sigue siendo server component sin JS de cliente. `?demo=1` alterna entre las dos vistas:

- **Vista por defecto**: el botón de Google como ahora, más un botón secundario "Ver una demo" que
  es un `<Link href="/login?demo=1">`.
- **Vista de catálogo**: rejilla de tarjetas, una por perfil, cada una con su `<form>` y un
  `<input type="hidden" name="profileId">` que llama a `signIn("demo", { profileId, redirectTo: "/" })`.
  Cada tarjeta muestra nombre, titular, patrimonio y el rótulo de perfil ficticio.

Estilos nuevos en [app/globals.css](app/globals.css) reutilizando los tokens y breakpoints que ya
existen (`--sp-*`, `--fs-*`, 560/820px); `.login-card` pasa a `max-width` mayor solo en la vista de
catálogo.

### 5. Aviso de demo en la app — `components/WealthApp.tsx`

Una barra fina bajo la cabecera: "Estás en una demo con datos ficticios · los cambios no se guardan
al salir · Entrar con mi cuenta". El indicador llega en la respuesta de `/api/data` como
`user.demo` + `user.demoProfile`, ampliando `SessionInfo` en [lib/store.ts:22-26](lib/store.ts#L22-L26).
No se bloquea nada: la escritura está permitida, es el punto de la decisión tomada.

## Catálogo de perfiles

Ocho perfiles, de menor a mayor. Todos en euros, con entidades reales, y con 6–10 snapshots
mensuales que cuentan una historia coherente (aportaciones periódicas, caída de mercado y
recuperación) para que Evolución y Comparar tengan sustancia.

| # | Perfil (ficticio) | Escala | Qué demuestra |
|---|---|---|---|
| 1 | Peón de obra, 34 años | ~9.500 € | Lo mínimo: nómina, efectivo, un fondo indexado recién abierto |
| 2 | Técnica sanitaria, primer plan | ~38.000 € | Colchón de emergencia + primeras aportaciones |
| 3 | Pareja con hipoteca | ~210.000 € | Vivienda, plan de pensiones, seguro de vida |
| 4 | Autónomo con sociedad | ~480.000 € | Tesorería de empresa, monetarios, local en alquiler |
| 5 | Ingeniera senior camino del FIRE | ~1,3 M € | Cartera indexada pura, alta tasa de ahorro |
| 6 | Médico jubilado, rentas | ~3,2 M € | Renta fija, dividendos, SOCIMIs, oro |
| 7 | Family office pequeño | ~26 M € | Las 12 clases usadas, capital riesgo, arte |
| 8 | Fundador tecnológico tras vender | ~2.400 M € | Concentración en participación, fundación, venture |

**Instrumentos reales** de los que tirar (verificados en esta investigación; el implementador
comprueba ISIN y TER antes de escribirlos):

- Renta variable: iShares Core MSCI World UCITS ETF Acc `IE00B4L5Y983` (TER 0,20%); Vanguard FTSE
  All-World UCITS ETF Acc `IE00BK5BQT80` (TER 0,14%); Vanguard Global Stock Index Fund EUR Acc
  `IE00B03HD191` (TER 0,18%).
- Monetario: Groupama Trésorerie IC (TER 0,15%); La Française Trésorerie ISR — el que usa la Cartera
  de Ahorro de MyInvestor.
- Oro: Invesco Physical Gold ETC `IE00B579F325` (TER 0,12%).
- Renta fija: Letras del Tesoro español a 12 meses; bonos del Estado.
- Entidades: Bankinter, MyInvestor, Renta 4, Indexa Capital, Trade Republic, Interactive Brokers,
  Banco Santander; en los perfiles grandes, bancas privadas internacionales.
- Reparto por clases de los perfiles 7 y 8 calibrado con el **UBS Global Family Office Report 2025**
  (RV 30%, RF 18%, liquidez 8%, capital riesgo 21%, deuda privada 4%, hedge funds 4%, inmuebles 11%,
  oro 2%, infraestructura 1%, arte 1%).

Las clases de activo disponibles son las 12 de [lib/types.ts:7-20](lib/types.ts#L7-L20); los perfiles
6–8 deben usarlas todas para que el donut de Clases luzca.

## Icono y favicon

- `app/icon.svg` — anillo tipo donut, hueco central, un segmento destacado, degradado
  `#2a78d6 → #1baf7a` (el mismo de `.brand-dot`, [globals.css:123-126](app/globals.css#L123-L126)).
  Trazo grueso para que a 16px se lea como un anillo y no como una mancha.
- `app/apple-icon.png` (180×180) y `app/icon.png` (512×512) — rasterizados desde el SVG con Brave
  headless, que ya se usó en la tarea anterior.
- `app/layout.tsx`: añadir `metadata.icons` y `metadata.openGraph`.

El App Router sirve `app/icon.*` y `app/apple-icon.*` automáticamente; `middleware.ts` ya excluye
`favicon.ico` del matcher y no hace falta tocarlo.

## Archivos que se tocan

| Archivo | Cambio |
|---|---|
| [auth.config.ts](auth.config.ts) | Proveedor `Credentials` demo + ramificar `signIn`/`jwt`/`session` |
| [types/next-auth.d.ts](types/next-auth.d.ts) | `demo` y `demoProfile` en Session y JWT |
| `lib/demo/profiles.ts`, `lib/demo/data/*.ts` | Nuevos: catálogo y fixtures |
| `lib/services/demoService.ts` | Nuevo: siembra idempotente |
| [lib/services/wealthService.ts](lib/services/wealthService.ts) | Solo el helper `demoTtl` en tres escrituras |
| [app/api/data/route.ts](app/api/data/route.ts) | Sembrar si es demo y está vacío; devolver `user.demo` |
| [app/login/page.tsx](app/login/page.tsx) | Botón de demo + vista de catálogo con `?demo=1` |
| [components/WealthApp.tsx](components/WealthApp.tsx), [lib/store.ts](lib/store.ts) | Aviso de demo y flag en `SessionInfo` |
| [app/globals.css](app/globals.css) | Estilos del catálogo y del aviso |
| `app/icon.svg`, `app/icon.png`, `app/apple-icon.png`, [app/layout.tsx](app/layout.tsx) | Icono de marca |
| [infra/dynamodb.yml](infra/dynamodb.yml) | `TimeToLiveSpecification` sobre `ttl` |

## Verificación

1. **Tests nuevos** en `tests/`, siguiendo el estilo de [tests/isolation.test.ts](tests/isolation.test.ts)
   (entorno node, sin DOM, con `resetMemory()`):
   - cada fixture del catálogo pasa `groupsSchema` y `snapshotSchema`, y todo `subgroupId` referenciado
     en los `values` de un snapshot existe en los grupos — un id huérfano rompería Comparar;
   - dos sesiones demo del mismo perfil generan `userId` distintos y no se ven entre sí;
   - la siembra es idempotente: llamarla dos veces no duplica grupos ni snapshots;
   - los totales de cada perfil cuadran con la escala anunciada en el catálogo.
2. `npm test`, `npm run lint`, `npx tsc --noEmit` y `npm run build`.
3. Recorrido real con Brave headless, sin AWS (almacén en memoria), sobre `/login`: abrir el
   catálogo, entrar con 3 perfiles de escalas distintas y capturar las 6 pestañas en 390 y 1440px,
   comprobando cero desbordamiento horizontal como en la pasada anterior.
4. Comprobar que en demo se puede **editar**: cambiar un importe, crear un snapshot y verlo en
   Comparar; y que al salir y volver a entrar en el mismo perfil la cartera aparece limpia.
5. Confirmar que el login con Google sigue intacto (el `signIn` ramificado es el riesgo) y que el
   icono se sirve en `/icon.svg` con el `<link rel="icon">` correcto en el HTML.

## Fuentes

- [UBS Global Family Office Report 2025](https://www.ubs.com/global/en/media/display-page-ndp/en-20250521-global-family-office-report-2025.html) — reparto por clases de los perfiles grandes
- [justETF · iShares Core MSCI World IE00B4L5Y983](https://www.justetf.com/en/etf-profile.html?isin=IE00B4L5Y983)
- [justETF · Vanguard FTSE All-World Acc IE00BK5BQT80](https://www.justetf.com/en/etf-profile.html?isin=IE00BK5BQT80)
- [justETF · Invesco Physical Gold ETC IE00B579F325](https://www.justetf.com/en/etf-profile.html?isin=IE00B579F325)
- [quefondos · Vanguard Global Stock Index IE00B03HD191](https://www.quefondos.com/es/fondos/ficha/index.html?isin=IE00B03HD191)
- [Rankia · mejores fondos monetarios](https://www.rankia.com/blog/fondos-inversion/5789028-mejores-fondos-monetarios)
