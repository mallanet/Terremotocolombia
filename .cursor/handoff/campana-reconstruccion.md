# Handoff — campaña de reconstrucción

Estado a 2026-08-16. Rama `feat/campana-reconstruccion`, subida, con el PR
[#47](https://github.com/mallanet/Terremotocolombia/pull/47) abierto contra
`main`. **No está en staging** (ver el bloqueo abajo).
Documentación funcional en `docs/campaign-reconstruccion.md`.

## Qué hay hecho

Cinco commits, en orden:

| Commit | Contenido |
| --- | --- |
| esquema | Cinco tablas nuevas + migración `0010` (aditiva) |
| API y landing | Servicios, rutas públicas, `/reconstruccion`, certificado |
| panel | Cuatro recursos CRUD bajo la capacidad `campaign` |
| fix | Guardias que no llamaban a `next()` + CORS de la cabecera nueva |
| docs | Este handoff |

Verificado en local con el stack de compose, de punta a punta: registrar
una donación, confirmarla desde la pantalla del responsable, ver el
certificado pasar a verificado y las cifras moverse.

Verde: backend 731 pruebas, frontend 148, admin 164. Lint y typecheck
limpios en los tres paquetes.

## BLOQUEO: staging y main tienen esquemas distintos

`staging` va por delante de `main` con dos migraciones que nunca llegaron
a producción:

| Etiqueta | Qué trae | Dónde vive |
| --- | --- | --- |
| `0010_furry_marauders` | Listas oficiales de fallecidos | solo `staging` |
| `0011_query_observability` | Observabilidad de consultas (PR #45) | solo `staging` |
| `0010_wide_lionheart` | Las cinco tablas de la campaña | solo esta rama |

Dos migraciones distintas con el índice `0010`. El merge a `staging` da
conflicto en `_journal.json` y en `meta/0010_snapshot.json` — abortado, sin
tocar nada.

El número no es el problema de fondo: cualquier numeración es una apuesta
sobre el orden de merge. Rebasar sobre `staging` metería esas dos
funcionalidades ajenas en el PR a `main`. Forzar el merge dejaría la misma
DDL con etiquetas distintas en cada entorno.

**Decisión pendiente del mantenedor.** La opción recomendada: llevar
primero a `main` lo que ya está en `staging`, y después renumerar la de la
campaña para que vaya limpia a los dos sitios.

## El fallo que apareció al probarlo (importante)

`requireSupplyWrite` estaba escrito con `asyncHandler`, que **no llama a
next()** cuando la función termina bien. Consecuencia en producción: toda
escritura AUTORIZADA de insumos de hospital (semáforo, necesidades,
solicitudes de ayuda) se queda colgada hasta el timeout. El rechazo
contesta 401 al instante, que es justo por lo que no se notaba.

Verificado en local: 8 segundos sin respuesta con token válido. Va
arreglado en el commit `fix`, con prueba de regresión
(`backend/test/middleware-continues.test.ts`).

**Esto no llega a producción hasta que alguien despliegue el backend a
mano.** Es una razón más para hacerlo pronto.

## Entorno local, tal como quedó

`docker compose` levantado con los cinco servicios. La base local tiene la
migración aplicada y datos DEMO para recorrer el flujo:

| Qué | Dónde |
| --- | --- |
| Landing | http://localhost:3000/reconstruccion |
| Panel | http://localhost:3001 |
| API | http://localhost:8080 |

Tres puntos DEMO (Bogotá, Medellín, Cali), cada uno con su responsable.
Los enlaces con token están en el hilo de la conversación; si se pierden,
se crea otro responsable desde el panel (el token se ve UNA vez).

**Contraseña local fijada a mano:** `admin@example.org` /
`localadminpass123`. La del usuario sembrado no coincidía con la de
`docker-compose.yml`. Solo afecta a la base local.

**Pendiente de limpiar:** las filas DEMO de `campaign_sites`,
`campaign_site_stewards` y las que genere el recorrido. Se borran filtrando
por el prefijo `DEMO`. Ninguna toca staging ni producción.

## Pasos manuales para desplegar, en este orden

1. Resolver el bloqueo de numeración de migraciones (arriba).
2. Aplicar la migración contra Neon **direct** (no `-pooler`).
3. Desplegar el backend (`deploy-backend.yml`, dispatch).
4. Dar la capacidad `campaign` al rol que opere la campaña.
5. Crear los puntos y sus responsables en el panel; repartir los enlaces.

Frontend y panel se despliegan solos al mergear a `main`. La landing sin
puntos enseña el formulario pero no dice dónde entregar, así que conviene
crear los puntos el mismo día.

## Lo que no está

- Correo automático con el código al registrar la donación. Hoy el código
  se muestra en pantalla y punto.
- Los lotes de salida (`material_shipments`) se crean a mano en el panel;
  no hay pantalla pública de seguimiento del camión.
- `admin-shipments`/`admin-pledges` no tienen pruebas propias: dependen de
  base de datos, igual que el resto de servicios del panel.
- `docs/architecture.md` no se tocó: el fichero está por encima del techo
  de tamaño y el gate rechaza hacerlo crecer. La arquitectura de la
  campaña vive en `docs/campaign-reconstruccion.md`.
