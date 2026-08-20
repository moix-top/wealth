# Mi Patrimonio · wealth.moix.top

Control de finanzas personales multiusuario: patrimonio por grupos y subgrupos,
distribución por clase de activo, snapshots del histórico, comparativa entre dos
momentos y gráfico de evolución.

Cada persona entra con su cuenta de Google y ve **solo sus datos**. También se
puede probar sin cuenta desde el **modo demo** de la pantalla de acceso.

> Antes de tocar código, lee [CLAUDE.md](CLAUDE.md): reúne las invariantes que no
> se pueden romper (aislamiento de datos, Edge Runtime, permisos IAM) y las
> convenciones del proyecto.

- **Stack**: Next.js 14 (App Router, TypeScript) · Auth.js v5 con Google ·
  DynamoDB (single-table) · Recharts
- **Infra**: CloudFormation desplegado desde GitHub Actions
- **Hosting**: Vercel

---

## Cómo se garantiza el aislamiento entre usuarios

Son datos financieros: el aislamiento no es una comprobación más, es la
invariante del sistema.

1. El identificador de usuario es el **email verificado** de Google y sale
   exclusivamente de la sesión del servidor ([lib/auth.ts](lib/auth.ts)).
   Ninguna ruta lo acepta del body, de la query ni de la URL.
2. Ese identificador es la **clave de partición** de DynamoDB (`pk = USER#<email>`).
   Un usuario no puede ni nombrar la partición de otro.
3. Toda lectura es un `Query` acotado a esa `pk`. **Nunca se usa `Scan`.**
4. El id de un snapshot ajeno se busca dentro de la partición propia: no aparece,
   así que responde 404 igual que uno inexistente
   ([lib/services/wealthService.ts](lib/services/wealthService.ts)).
5. Los ítems se construyen campo a campo; un `pk`/`sk` inyectado en el body se
   descarta.
6. Solo se admiten cuentas con `email_verified: true`. Si no, alguien podría
   reclamar el email de otra persona ([auth.config.ts](auth.config.ts)).

Todo esto está cubierto por tests: [tests/isolation.test.ts](tests/isolation.test.ts).

### Modelo de datos

| Entidad  | pk               | sk                       |
|----------|------------------|--------------------------|
| Perfil   | `USER#<email>`   | `PROFILE`                |
| Cartera  | `USER#<email>`   | `PORTFOLIO`              |
| Snapshot | `USER#<email>`   | `SNAPSHOT#<iso>#<id>`    |

La fecha va delante del id en la `sk` para que el histórico venga ya ordenado.

---

## Desarrollo local

```bash
npm install
cp .env.example .env.local     # rellena AUTH_* (ver paso A de abajo)
npm run dev                    # http://localhost:3000
```

Sin `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` la app arranca en **modo
memoria**: funciona entera, pero los datos no persisten al reiniciar. Es lo que
usan los tests y el build de CI.

```bash
npm test          # 24 tests, sin AWS ni Google
npm run build
```

---

## Puesta en producción

### A. Google Cloud Console (credenciales OAuth)

1. [console.cloud.google.com](https://console.cloud.google.com) → crea un
   proyecto (p. ej. `wealth-moix`).
2. **APIs y servicios → Pantalla de consentimiento de OAuth**:
   - Tipo de usuario: **Externo**.
   - Nombre de la app, email de asistencia, email de contacto.
   - Scopes: solo `openid`, `email` y `profile` (los que pide Auth.js por
     defecto). Al ser scopes no sensibles, Google **no exige verificación**.
   - **Publica la app** (botón *Publicar aplicación* → *En producción*). Si la
     dejas en *Prueba* solo podrán entrar 100 cuentas que añadas a mano, y tú
     quieres registro abierto.
3. **Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**:
   - *Orígenes autorizados de JavaScript*:
     - `https://wealth.moix.top`
     - `http://localhost:3000`
   - *URI de redirección autorizados*:
     - `https://wealth.moix.top/api/auth/callback/google`
     - `http://localhost:3000/api/auth/callback/google`
4. Guarda el **Client ID** y el **Client secret**.

> Los deploys de *preview* de Vercel tienen URL aleatoria y no pueden pasar por
> Google OAuth. Prueba en local o en producción.

### B. Scripts que ejecutas tú (perfil AWS `radamuz`)

Necesitas `aws` y `gh` instalados y autenticados.

```bash
# 1. Usuario IAM de despliegue + secretos en GitHub
./scripts/setup-github-secrets.sh --profile radamuz --repo moix-top/wealth

# 2. Lanza el workflow en GitHub:
#    Actions → "Deploy infra (DynamoDB)" → Run workflow
#    (o simplemente haz push de infra/** a main)
#    Espera a que el stack quede en CREATE_COMPLETE.

# 3. Usuario IAM de runtime + imprime las variables para Vercel
./scripts/setup-aws.sh --profile radamuz

# 4. Migra tus datos actuales (primero en seco, que no escribe nada)
AWS_PROFILE=radamuz npm run import -- \
  --file /LINUXDATA/repos/github.com/radamuz/wealth/data.json \
  --email radamuz16@gmail.com \
  --overrides scripts/asset-classes.example.json \
  --dry-run
# revisa el listado y el total (95.565,47 €), y repite sin --dry-run
```

El import resuelve las credenciales por la cadena habitual del SDK, así que
`AWS_PROFILE=radamuz` basta. También valen las claves del usuario
`wealth-data-vercel` exportadas o puestas en `.env.local`.

**Tres usuarios IAM con permisos separados**, a propósito:

| Usuario | Puede | No puede |
|---|---|---|
| `wealth-data-deploy` (GitHub Actions) | crear/modificar la tabla | leer ni escribir datos |
| `wealth-data-vercel` (la app) | leer/escribir datos de la tabla | tocar la infraestructura |
| tu perfil `radamuz` | todo (solo desde tu máquina) | — |

Los permisos de `wealth-data-deploy` están acotados verbo a verbo, así que
**cada propiedad nueva en `infra/dynamodb.yml` puede exigir una acción IAM
nueva**. Si no se añade antes, el despliegue falla con `AccessDenied` sobre esa
acción concreta (pasó al añadir `TimeToLiveSpecification`, que necesita
`dynamodb:UpdateTimeToLive`). Para actualizar solo la política, sin rotar
credenciales ni resubir secretos:

```bash
./scripts/update-deploy-policy.sh --profile radamuz
```

Y después relanza el workflow *Deploy infra (DynamoDB)*.

### C. Secretos en GitHub

Los pone `setup-github-secrets.sh`. Comprueba en
*Settings → Secrets and variables → Actions* que existen:

| Secreto | Origen |
|---|---|
| `AWS_ACCESS_KEY_ID` | usuario `wealth-data-deploy` |
| `AWS_SECRET_ACCESS_KEY` | ídem |

### D. Variables de entorno en Vercel

*Settings → Environment Variables*, marcando **Production, Preview y Development**:

| Variable | Valor |
|---|---|
| `AWS_REGION` | `eu-west-1` |
| `DYNAMODB_TABLE` | `wealth-data` |
| `AWS_ACCESS_KEY_ID` | del usuario `wealth-data-vercel` (lo imprime `setup-aws.sh`) |
| `AWS_SECRET_ACCESS_KEY` | ídem |
| `AUTH_SECRET` | `openssl rand -base64 32` — el mismo valor en Production y Preview |
| `AUTH_GOOGLE_ID` | Client ID del paso A |
| `AUTH_GOOGLE_SECRET` | Client secret del paso A |
| `AUTH_TRUST_HOST` | `true` |

> ⚠️ **No definas `AUTH_URL`.** Fijaría la URL de callback a un solo dominio y
> rompería el login desde cualquier otro.

### E. Dominio

Vercel → *Settings → Domains* → añade `wealth.moix.top`, y crea en el DNS de
`moix.top` el registro CNAME que te indique Vercel.

---

## Verificación tras desplegar

```bash
# 1. La tabla existe, con backups y protección de borrado
aws dynamodb describe-table --table-name wealth-data --profile radamuz \
  --query 'Table.{Estado:TableStatus,Proteccion:DeletionProtectionEnabled}'

# 2. Tus datos están donde deben
aws dynamodb query --table-name wealth-data --profile radamuz \
  --key-condition-expression "pk = :pk" \
  --expression-attribute-values '{":pk":{"S":"USER#radamuz16@gmail.com"}}' \
  --query 'Items[].sk.S'

# 3. Sin sesión, la API responde 401 JSON (no HTML)
curl -i https://wealth.moix.top/api/data
```

Y en el navegador: entra en `https://wealth.moix.top` con `radamuz16@gmail.com`
y comprueba que el Resumen marca **95.565,47 €** con 9 grupos. Después, entra
con otra cuenta de Google distinta y confirma que arranca vacía.

---

## Origen del código

La funcionalidad viene de una app anterior (Vite + React + Express, un
`data.json` en disco, sin login). Se conservan las seis vistas, la paleta y los
cálculos; lo que cambia es la persistencia (DynamoDB por usuario), la
autenticación (antes no había) y la validación de entrada (antes tampoco).
