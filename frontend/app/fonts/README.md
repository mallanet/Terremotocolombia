# Tipografías auto-alojadas

Estos `.woff2` están versionados a propósito. Antes se descargaban de Google en
**tiempo de build** vía `next/font/google`; un fallo de red transitorio hablando
con Google tumbaba el build entero. Pasó de verdad: CI run 31429921516 en `main`
(2026-08-10) falló el job `frontend (typecheck + build)` con una cascada de
`module-not-found` apuntando a
`[next]/internal/font/google/ibm_plex_sans_8a3db1b0.module.css`; re-ejecutar el
**mismo commit** sin tocar una línea pasó en verde.

Eso no es solo ruido de CI. `.github/workflows/deploy-frontend.yml` despliega a
**producción** en cada push a `main` que toque `frontend/**`, sin aprobación
manual. El mismo parpadeo durante ese workflow tumba un despliegue de un sitio
que usa gente buscando a familiares — y la traza parece un error de código, no
un problema de red.

Con los ficheros aquí, `next build` no hace ni una petición de red por fuentes.

## Qué hay y de dónde salió

| Fichero | Familia | Tipo | Pesos |
| --- | --- | --- | --- |
| `sora-latin-variable.woff2` | Sora | variable (`fvar`) | 600–700 |
| `ibm-plex-sans-latin-variable.woff2` | IBM Plex Sans | variable (`fvar`) | 400–700 |
| `ibm-plex-mono-latin-400.woff2` | IBM Plex Mono | estática | 400 |
| `ibm-plex-mono-latin-500.woff2` | IBM Plex Mono | estática | 500 |

**Procedencia:** son los bytes exactos que `next/font/google` ya venía sirviendo
en producción. Se extrajeron de `.next/static/media/` tras un `npm run build` del
commit anterior al cambio, tomando los slices marcados `.p.` en el nombre — los
que Next *precarga*, es decir el subset `latin` que declaraba
`subsets: ["latin"]`. No se regeneraron ni se re-subsetearon: copiarlos es lo que
garantiza que el render es idéntico al de antes, no solo parecido.

Sora e IBM Plex Sans son **variables** (se comprobó leyendo el directorio de
tablas del woff2: tienen `fvar`), así que un único fichero cubre todo el rango de
pesos del sitio. IBM Plex Mono no tiene `fvar`, de ahí un fichero por peso.

## Solo `latin`, a propósito

El sitio es `lang="es"`. Los glifos del español (á, é, í, ó, ú, ñ, ü, ¿, ¡) viven
todos en `U+0000-00FF`, dentro del subset `latin`. Los otros slices que Next
emitía (`latin-ext`, `cyrillic`, `cyrillic-ext`, `greek`, `vietnamese`) no se
descargaban nunca salvo que la página contuviera esos glifos: eran 14 ficheros
más y ~155 KB en el repo para cubrir texto que este sitio no produce.

`next/font/local` **no puede** expresar `unicode-range` por fichero (sus entradas
`src` solo aceptan `{path, weight, style}`), así que conservar el troceado por
subsets habría exigido escribir los `@font-face` a mano, con los rangos y las
métricas de fallback transcritos a mano y sin nada que valide un número mal
copiado. Se descartó: cambia un fallo ruidoso (build en rojo) por uno silencioso
(render mal en producción).

Para texto fuera de `latin` —por ejemplo si alguien traduce la página con el
widget de Google Translate— el navegador hace *fallback por carácter* a la
siguiente familia de la pila. Google Translate reescribe los nodos de texto pero
no toca `font-family`, así que el resultado es texto perfectamente legible con
las métricas ya ajustadas, no tofu.

## Licencia

Ambas familias son **SIL Open Font License 1.1**. La OFL permite redistribuir y
auto-alojar; a cambio exige (cláusula 2) que cada copia lleve el aviso de
copyright y la licencia. Por eso están aquí, copiados literalmente de upstream
sin editar:

| Fichero | Cubre | Origen |
| --- | --- | --- |
| `OFL-Sora.txt` | `sora-latin-variable.woff2` | `google/fonts` → `ofl/sora/OFL.txt` |
| `OFL-IBM-Plex.txt` | los tres `ibm-plex-*.woff2` | `IBM/plex` → `LICENSE.txt` |

Son dos ficheros y no uno porque cada familia tiene su propio aviso de copyright
(Sora: The Sora Project Authors; Plex: IBM Corp., con nombre reservado "Plex").
El cuerpo de la licencia es idéntico en ambos salvo un `http`/`https` en el
enlace a scripts.sil.org.

## Si hay que actualizarlas

No las bajes a mano de fonts.google.com: esos ficheros no vienen subseteados
igual y el render dejaría de coincidir. El camino reproducible es:

1. En una rama temporal, volver a `next/font/google` en `app/layout.tsx` con los
   mismos pesos y `subsets: ["latin"]`.
2. `npm run build`.
3. Copiar de `.next/static/media/` los `.woff2` que lleven `.p.` en el nombre.
4. Revertir la rama temporal y sustituir los ficheros de este directorio.
5. Rebuild y comprobar que las métricas del `@font-face` de fallback que genera
   Next no se han movido:

```bash
npm run build && tr '}' '}\n' < .next/static/chunks/*.css | grep -o '@font-face{font-family:[^}]*Fallback[^}]*}'
```

Referencia actual (debe seguir saliendo esto):

- `Sora Fallback` — ascent 85.29%, descent 25.5%, line-gap 0.0%, size-adjust 113.73%
- `IBM Plex Sans Fallback` — ascent 101.32%, descent 27.18%, line-gap 0.0%, size-adjust 101.17%
- `IBM Plex Mono Fallback` — ascent 76.16%, descent 20.43%, line-gap 0.0%, size-adjust 134.59%
