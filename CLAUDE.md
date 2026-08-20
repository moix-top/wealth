# Convenciones de este repositorio

Lo que hay que saber antes de tocar nada. El README explica cómo desplegar; esto
explica cómo trabajar aquí sin romper lo que ya está pensado.

## Reglas de trabajo

### AWS lo ejecuta el dueño del repo, siempre

Ningún agente ni colaborador ejecuta comandos contra la cuenta de AWS. Lo que se
entrega es un **script listo para ejecutar** y el aviso explícito de que hay que
lanzarlo. Vale para CloudFormation, IAM, DynamoDB y credenciales.

Quien propone el cambio es quien tiene que acordarse de incluir el script — no se
espera a que lo pidan.

### Cada cambio en `infra/` puede exigir un permiso IAM nuevo

La política de `wealth-data-deploy` está acotada **verbo a verbo** a propósito: ese
usuario crea y modifica la tabla, pero no puede leer los datos de nadie. El precio
es que una propiedad nueva en `infra/dynamodb.yml` suele estrenar una acción que no
está permitida, y el stack falla con `AccessDenied`.

Pasó al añadir `TimeToLiveSpecification`, que necesita `dynamodb:UpdateTimeToLive`
y `dynamodb:DescribeTimeToLive`.

Así que un cambio de infraestructura son **tres cosas en la misma entrega**:

1. el cambio en `infra/dynamodb.yml`;
2. los verbos nuevos en la política, en `scripts/setup-github-secrets.sh` **y** en
   `scripts/update-deploy-policy.sh` (llevan la misma política duplicada: si tocas
   una, toca la otra);
3. el aviso de ejecutar `./scripts/update-deploy-policy.sh --profile radamuz` y
   relanzar después el workflow *Deploy infra (DynamoDB)*.

`update-deploy-policy.sh` existe aparte porque `setup-github-secrets.sh` crea una
access key nueva en cada ejecución y obliga a resubir los secretos del repo.

### Verificar en el navegador, no solo compilar

`tsc`, `lint` y los tests no ven una maquetación rota ni un tooltip tapado. Para
cambios de interfaz se levanta la app y se comprueba de verdad; hay Brave en la
máquina y se puede conducir con `puppeteer-core` apuntando a
`/usr/bin/brave-browser`. Dos comprobaciones que han pillado fallos reales:
`document.documentElement.scrollWidth === clientWidth` en cada ancho, y el orden de
pintado cuando dos elementos posicionados se solapan.

La app exige sesión, así que para verla con datos basta entrar por el **modo demo**
(`/login?demo=1`), que funciona sin AWS.

## Invariantes que no se tocan

### Aislamiento entre usuarios

`lib/services/wealthService.ts` es la única vía de acceso a datos y su cabecera
lista cuatro invariantes: la `pk` se calcula dentro, toda lectura va acotada a esa
`pk` (nunca `Scan`), toda escritura lleva la `pk` en la clave, y los ítems se
construyen campo a campo sin *spread* del body.

`lib/auth.ts` es la **única** fuente del identificador de usuario. Ninguna ruta
puede leerlo del body, de la query ni de la URL.

### `auth.config.ts` corre en Edge

Ahí no puede entrar nada que arrastre `@aws-sdk/*` — ni `lib/dynamo.ts` ni
`lib/services/*`. El bundle de Edge no tiene `fs` y el build revienta con "Module
not found". `lib/demo/profiles.ts` cumple esa regla y por eso está separado de los
datos de demostración.

### Los iconos van fuera del matcher del middleware

El navegador los pide **sin sesión**, desde la propia pantalla de login. Si el
middleware los intercepta, la pestaña se queda sin icono.

## Cómo está montado

- **Sin Tailwind ni CSS modules**: un único `app/globals.css` con clases
  semánticas y tokens (`--sp-*`, `--fs-*`, `--tap`). Breakpoints: **560px** móvil y
  **820px** tablet, declarados una vez y compartidos con `lib/useMediaQuery.ts`
  para lo que Recharts necesita en números (altos de gráfico, ancho del eje).
- **Tema** claro/oscuro/auto: la paleta clara vive en `:root` a secas, y se
  redefine tanto bajo `prefers-color-scheme` como bajo `[data-theme]`. Un script
  inline en `app/layout.tsx` la aplica antes del primer pintado.
- **Modo demo**: `lib/demo/` (catálogo y fixtures) y `lib/services/demoService.ts`
  (siembra). No hay código de multi-tenancy: la sesión demo lleva un email
  sintético con un nonce, y el particionado normal hace el resto. Los fixtures se
  cargan por un mapa de imports **literales**; un `import()` con la ruta en una
  variable no lo sabe analizar el bundler.
- **Perfiles de demostración**: personajes ficticios, productos financieros reales
  (ISIN, TER, entidades). No se atribuyen carteras a personas reales.

## Estilo

- Código y comentarios **en español**, igual que la interfaz.
- Los comentarios explican **por qué**, no qué hace la línea de al lado. Si algo
  parece raro y tiene motivo, ese motivo se escribe.
- Ancho de línea ~100. No pases Prettier con su configuración por defecto: usa 80 y
  reformatea ficheros enteros, ensuciando el diff.
- Mensajes de commit en español, en imperativo, explicando el porqué del cambio.

## Comandos

```bash
npm run dev                 # http://localhost:3000
npm test                    # vitest, entorno node (no hay tests de DOM)
npm run lint
npx tsc --noEmit
AUTH_SECRET=dummy AUTH_GOOGLE_ID=dummy AUTH_GOOGLE_SECRET=dummy npm run build
```

Sin `AWS_ACCESS_KEY_ID` la app usa un almacén en memoria con la misma estructura de
claves que DynamoDB, así que se puede desarrollar y testear entera sin AWS.
