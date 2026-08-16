# Handoff — campaña de reconstrucción

Estado a 2026-08-16. Todo el trabajo está en la rama local, **sin subir**.
Documentación funcional en `docs/campaign-reconstruccion.md`.

## Qué hay hecho

Cuatro commits, en orden:

| Commit | Contenido |
| --- | --- |
| esquema | Cinco tablas nuevas + migración `0010` (aditiva) |
| API y landing | Servicios, rutas públicas, `/reconstruccion`, certificado |
| panel | Cuatro recursos CRUD bajo la capacidad `campaign` |
| fix | Guardias que no llamaban a `next()` + CORS de la cabecera nueva |

Verificado en local con el stack de compose, de punta a punta: registrar
una donación, confirmarla desde la pantalla del responsable, ver el
certificado pasar a verificado y las cifras moverse. Datos DEMO borrados
después (`sites=0 pledges=0 receipts=0`).

Verde: backend 731 pruebas, frontend 148, admin 164. Lint y typecheck
limpios en los tres paquetes.

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

## Pasos manuales, en este orden

1. Aplicar la migración `0010` contra Neon **direct** (no `-pooler`).
2. Desplegar el backend (`deploy-backend.yml`, dispatch).
3. Dar la capacidad `campaign` al rol que opere la campaña.
4. Crear los puntos y sus responsables en el panel; repartir los enlaces
   (el token se ve UNA vez).

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
