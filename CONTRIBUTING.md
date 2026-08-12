# Guía para contribuir

Gracias por ayudar a mejorar este proyecto. Es el sitio de respuesta al
terremoto de Colombia de 2026 —**terremotocolombia.co**, operado por
Mallanet.org— con mapa de reportes, directorio de hospitales/refugios, centros
de acopio y panel de administración. Recibe aportes de código, documentación,
pruebas, accesibilidad, rendimiento, datos públicos verificables y operaciones.

Es un despliegue **en producción sirviendo tráfico real**, no una plantilla de
demostración: la prioridad es proteger a las personas afectadas y mantener la
plataforma en pie.

Lee [`CLAUDE.md`](CLAUDE.md) antes de tu primer cambio: cubre dónde corre esto,
qué sale a producción solo, y qué no se toca sin un humano.

## Ramas y entornos

Dos ramas, dos entornos, y **cada merge despliega**:

| Rama | Entorno | Se despliega |
| --- | --- | --- |
| `staging` | https://staging.terremotocolombia.co<br>`api-staging.terremotocolombia.co` | automático al mergear |
| `main` | **https://terremotocolombia.co**<br>`api.terremotocolombia.co` | automático al mergear (frontend) |

El camino de un cambio es siempre el mismo:

```text
rama de trabajo  ──PR──▶  staging  ──(probar de verdad)──▶  PR  ──▶  main
```

- **Nunca abras un PR directo a `main`.** La única entrada a `main` es un PR
  desde `staging` que ya se probó en el entorno de staging.
- Staging tiene su **propia base de datos** (una rama de Neon), así que puedes
  crear reportes de prueba sin ensuciar el registro real de personas
  desaparecidas. En producción eso no se hace nunca.
- En **staging se despliegan los dos tiers automáticamente** (frontend y API).
  Es el motivo de existir del entorno: si probar un cambio de API exigiera un
  paso manual, nadie lo probaría. En **`main` el backend es manual**: se
  despliega lanzando `deploy-backend.yml` a mano, nunca con el merge. Mergear
  a `main` deja el código listo; la API vieja sigue sirviendo hasta que alguien
  pulsa el botón.
- Excepción justificable: un hotfix de producción puede ir directo a `main`,
  pero se porta a `staging` inmediatamente después para que no diverjan.

## Antes de empezar

- Revisa si ya existe una issue o PR relacionado.
- Para bugs, mejoras pequeñas o documentación, abre una issue usando las
  plantillas de GitHub.
- Para cambios grandes de arquitectura, datos, sincronización, admin, despliegue
  o UX crítica, abre primero una issue y, si hace falta, un documento de diseño
  corto (RFC) en `docs/`.
- No publiques datos personales, coordenadas privadas, teléfonos, correos,
  documentos de identidad, fotos privadas, secretos ni dumps de base de datos en
  GitHub.
- GitHub no es un canal de emergencia. Los reportes reales deben entrar por la
  app o por los canales de coordinación que defina quien opere ese despliegue.

## Formas de contribuir

- **Bugs:** reproduce el problema, describe el impacto y adjunta capturas
  redaccionadas cuando ayuden.
- **Mejoras de producto:** explica a que usuario ayuda, en que flujo ocurre y
  que comportamiento esperas.
- **Datos o fuentes externas:** documenta origen, licencia/permiso, frescura,
  formato, campos sensibles y estrategia de deduplicacion.
- **Documentación:** mantén el español claro y enlaza archivos existentes en
  vez de copiar bloques largos.
- **Seguridad o privacidad:** no abras issue pública; repórtalo por el canal
  privado de seguridad de tu fork u organización (p.ej. GitHub Security
  Advisories).

## Flujo fork-first

Usa este flujo si no eres maintainer con permiso de escritura en el repo
principal. Ajusta `mallanet`/`Terremotocolombia` por el org/repo real de tu
despliegue.

1. Haz fork de `mallanet/Terremotocolombia` en GitHub.
2. Clona tu fork:

   ```bash
   git clone https://github.com/TU_USUARIO/Terremotocolombia.git
   cd Terremotocolombia
   ```

3. Agrega el repo original como `upstream`:

   ```bash
   git remote add upstream https://github.com/mallanet/Terremotocolombia.git
   git fetch upstream
   ```

4. Crea tu rama desde `upstream/staging` (**no** desde `main`):

   ```bash
   git switch -c fix/descripcion-corta upstream/staging
   ```

5. Corre la app. Docker Compose es la vía preferida y levanta el stack completo
   (frontend + admin + backend + Postgres + Valkey) sin instalar dependencias a
   mano:

   ```bash
   docker compose up --build
   ```

6. Haz cambios pequeños y enfocados. Si el alcance crece, abre una issue nueva o
   separa otro PR.
7. Valida antes de subir, en cada paquete que tocaste:

   ```bash
   cd frontend && npm run lint && npm run typecheck && npm run build
   cd backend  && npm run lint && npm run typecheck && npm run build
   cd admin    && npm run lint && npm run typecheck && npm run build
   ```

8. Sube tu rama y abre un PR contra **`staging`** del repo principal. Nunca
   contra `main`: a `main` solo se llega promoviendo `staging` una vez probado.

Si eres maintainer, puedes crear una rama en el repo principal, pero conserva
la misma disciplina: rama descriptiva, PR pequeño, issue enlazada y
validación clara.

## Crear issues útiles

Antes de abrir una issue:

- Busca duplicados en issues abiertas y cerradas.
- Usa la plantilla más cercana: bug, mejora o documentación.
- Incluye pasos para reproducir, resultado actual, resultado esperado y contexto
  técnico cuando aplique.
- Redacta capturas: tapa nombres, teléfonos, direcciones, IDs y ubicaciones
  sensibles.
- Para incidentes de seguridad, privacidad o datos sensibles, no los describas
  en la issue: escribe por el canal privado de seguridad del proyecto.

Una buena issue debe dejar claro:

- **Impacto:** a quién afecta y por qué importa.
- **Alcance:** que parte de la app toca.
- **Evidencia:** enlaces, capturas redaccionadas, logs sin secretos o pasos
  reproducibles.
- **Criterio de cierre:** cómo sabremos que quedó resuelta.

## Expectativas para pull requests

Cada PR debe incluir:

- Issue relacionada (`Closes #123`) o una explicación de por qué no aplica.
- Descripción breve del problema y de la solución.
- Capturas o video si cambia UI.
- Validaciones ejecutadas (`npm run lint`, `npm run build`, pruebas manuales).
- Riesgos conocidos y plan de rollback si toca datos, cache, sync, despliegue o
  endpoints públicos.
- Notas de privacidad/seguridad si se agregan campos, logs, analítica,
  formularios, imágenes, geocodificación o integraciones externas.

Manten el PR revisable:

- Prefiere cambios pequeños a un PR grande con muchas responsabilidades.
- No mezcles refactors estéticos con fixes funcionales.
- No subas credenciales, `.env.local`, dumps o datos reales.
- Rebasea o actualiza tu rama si `staging` avanzó mucho antes de mergear.
- Responde comentarios con commits nuevos; evita resolver conversaciones sin
  explicar el cambio.

## Estilo de código

- TypeScript estricto, sin `as any` salvo justificacion clara.
- Validaciones del lado servidor para entradas públicas.
- Mensajes de error visibles cuando una escritura falla.
- Helpers compartidos en `frontend/lib/`, `backend/src/lib/` o
  `backend/src/middleware/` antes de duplicar lógica.
- UI accesible en movil y escritorio.
- Variables de entorno nuevas documentadas en `.env.example`.

## Crear endpoints de API (OBLIGATORIO)

La API vive en el backend Express (`backend/src/routes/` para el sitio público +
admin, `backend/src/public-api/` para la superficie autenticada por capacidades).
Las reglas se **enforcan con ESLint** (`backend/eslint-rules/`, corren en
`npm run lint` + CI); romperlas falla el PR. Reglas duras:

- **`require-rate-limit`**: TODA ruta declara `rateLimit({ scope, limit })`.
- **`user-facing-mutation-needs-guard`**: toda mutación de `src/routes/*` lleva
  `requireHuman` (Turnstile) o un gate (`requireAdmin` / `requireCapability` /
  `requireCron` / `requireSupplyWrite`). La excepción anónima se documenta con
  `// eslint-disable-next-line local/user-facing-mutation-needs-guard -- razón`.
- **`no-turnstile-in-public-api`**: `src/public-api/*` no usa Turnstile.
- **Sin I/O largo de terceros inline**: ese trabajo se ENCOLA en BullMQ y el
  handler responde `202 {jobId}` (status-poll en `/api/sync/status`).

> **Dos avisos sobre el estado real, para que no te confundan al probar:**
>
> - `requireHuman` **no verifica nada en producción ahora mismo**:
>   `TURNSTILE_SECRET_KEY` está retirada del Worker, así que la comprobación
>   pasa siempre. La regla de ESLint sigue siendo obligatoria —el gate debe
>   estar en el código— pero hoy no te protege en vivo.
> - El **worker de BullMQ no está desplegado**. Encolar sigue siendo lo
>   correcto y es lo que debes escribir, pero en producción **nadie consume la
>   cola**: un `202 {jobId}` no terminará nunca. Tenlo en cuenta antes de
>   apoyar una funcionalidad nueva sobre un job.
- Bloque **`@swagger`** sobre el primer handler de los routes a mano (los routers
  de la fábrica CRUD auto-documentan desde su esquema zod).

Recomendado: lecturas en paralelo (`Promise.all`), GET público con `cached()` +
`jsonWithEtag()`, IP siempre hasheada (`hashIp`), nunca serializar el objeto
completo a respuestas públicas.

Detalle completo y ejemplos: `AGENTS.md` ("Endpoints del backend").

## Estilo de documentación

- Escribe en español.
- Usa nombres de archivo en `kebab-case.md`.
- Estado actual del sistema va en `docs/architecture.md`; sistema de diseño en
  `docs/DESIGN.md`. Si el proyecto crece, organiza propuestas/decisiones en
  subcarpetas nuevas (`docs/rfcs/`, `docs/adr/`, `docs/guides/`).
- Enlaza documentos existentes en lugar de copiar bloques largos.

## Conducta esperada

Este repositorio existe para ayudar en una emergencia. Se espera trato
respetuoso, colaboración de buena fe y cuidado especial al hablar de personas
afectadas. No se aceptan doxxing, acoso, especulación sobre víctimas, uso de
datos sensibles para demostrar un punto, ni presión para publicar información
que no haya sido verificada por los canales del proyecto.
