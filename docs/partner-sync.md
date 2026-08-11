# Integración de socio — partner-sync

Guía corta para el socio externo que empuja personas desaparecidas hacia este
sistema por API, en vez de que alguien las cargue a mano. Cubre solo el
endpoint de partner-sync — para el resto de la API pública ver
`docs/architecture.md` y el catálogo OpenAPI.

**Estado:** endpoint síncrono de prueba, para UN socio nombrado y vetted (no
hay onboarding abierto). No usar en producción con datos reales de personas
sin que el mantenedor lo confirme — ver "Reglas" al final.

## Endpoint

```
POST /api/public/partner-sync/missing
```

- **Staging:** `https://api-staging.terremotocolombia.co/api/public/partner-sync/missing`
- **Producción:** `https://api.terremotocolombia.co/api/public/partner-sync/missing`
  (ver "Reglas" — no la uses hasta que el mantenedor te confirme que puedes).

## Autenticación

```
Authorization: Bearer <api-key>
```

La API key (`mer_sk_…`) la genera un administrador del panel para tu cuenta,
con el scope `missing:create` únicamente. La llave define:

- **`source`** — se deriva SIEMPRE del email de la cuenta dueña de la llave
  (`partner:<tu-email>`), nunca de nada que mandes en el body. No hay forma de
  escribir bajo la identidad de otro socio.
- **Kill-switch total** — si el administrador revoca tu llave, el siguiente
  request responde `401` de inmediato. No hace falta desplegar nada para
  cortar el acceso de un socio.

## Payload

```json
{
  "people": [
    {
      "externalId": "string, obligatorio — el id de la persona EN TU sistema",
      "name": "string, obligatorio",
      "age": "number 0-130, opcional",
      "description": "string, opcional",
      "lastSeen": "string, opcional",
      "contact": "string, opcional",
      "photoUrl": "URL http(s) absoluta, opcional",
      "sourceUrl": "URL http(s) absoluta, opcional",
      "status": "\"active\" | \"found\", opcional (default \"active\") — ver 'Cambios de status' abajo para qué pasa en un re-sync",
      "resolutionNote": "string, opcional — solo aplica si status=found",
      "resolvedAt": "epoch ms, opcional",
      "createdAt": "epoch ms, opcional"
    }
  ]
}
```

**Tope de lote: 50 personas por llamada.** Es una ruta síncrona (corre en el
tiempo del request, sin cola de fondo) — un lote de 51 o más, o un registro
sin `externalId`/`name`, responde `400` con un mensaje describiendo el
problema. Si tienes más de 50 registros, divídelos en varias llamadas.

### Respuesta (200)

```json
{
  "source": "partner:tu-email@tu-dominio.org",
  "inserted": 0,
  "updated": 0,
  "skipped": 0,
  "errors": 0
}
```

`skipped` incluye tanto registros inválidos (sin `externalId`/`name`) como
registros bloqueados por el equipo (ver "Kill-switch por registro" abajo) — el
endpoint no distingue el motivo en la respuesta, para no filtrar a un socio
que su ficha fue bloqueada específicamente.

`updated` cuenta cualquier fila existente tocada por el batch — incluida una
donde lo único que cambió fue nombre/edad/descripción/foto/etc. y tu `status`
quedó como **señal pendiente de revisión** en vez de aplicarse (ver "Cambios
de status" abajo). `updated` no significa "tu transición de status ya está
en vivo". Hoy no hay ningún campo en la respuesta que distinga un re-sync
totalmente aplicado de uno con una señal pendiente — si necesitas saberlo,
pídeselo al equipo por otra vía.

### Errores

| Status | Motivo |
| --- | --- |
| `400` | Body inválido: falta `externalId`/`name`, lote de más de 50, URL mal formada, etc. |
| `401` | Falta `Authorization`, la llave no existe, o fue revocada/expiró. |
| `403` | La llave es válida pero no tiene el scope `missing:create`. |
| `429` | Rate limit (30 llamadas por ventana, por IP). Reintenta con backoff. |

## Dominios de media permitidos

`photoUrl` y `sourceUrl` se comparan contra un **allowlist de dominios
configurado por el mantenedor** para tu cuenta (código, no un ajuste que
puedas cambiar tú). Si el hostname de la URL no está en tu lista:

- El campo se guarda `null` — **la persona se crea/actualiza igual**, solo se
  cae la foto o el enlace de origen.
- No es un error: la respuesta sigue siendo `200` y ese registro cuenta en
  `inserted`/`updated`, no en `skipped`.

Si necesitas que un dominio tuyo quede permitido, pídeselo al mantenedor con
el hostname exacto (p. ej. `cdn.tu-dominio.org`) — es un cambio de código
revisado, no algo que se resuelva por soporte en caliente.

## Contrato de deduplicación

- `externalId` es **obligatorio** y es la mitad de la clave de dedup, junto
  con tu `source` (que tú no controlas — sale de tu llave). Sin un
  `externalId` estable de tu lado, no hay forma de reconciliar un re-envío sin
  duplicar.
- Re-enviar el mismo `externalId` **actualiza** la ficha existente (upsert),
  nunca crea una segunda fila. Es seguro reintentar un lote completo tras un
  timeout o un error de red.
- Nombre, edad, descripción, últimas señas y contacto se sobreescriben de
  inmediato con lo que mandes en cada re-sync. Foto (`photoUrl`) y
  `sourceUrl` solo se completan si la ficha no tenía ya un valor guardado —
  no se pisan una vez puestos. Nada de esto pasa por revisión humana.

### Cambios de status: señal, no verdad

El `status` no se comporta como el resto de los campos. Aplica **"señal, no
verdad"** (mismo principio que el resto del sistema — ver
`docs/architecture.md`):

- **Primera vez que vemos ese `externalId`** (fila nueva): el `status` que
  mandes se guarda tal cual, sin revisión — es el estado inicial, no una
  transición.
- **Re-sync de una ficha que ya existe**: si el `status` que mandas es
  DISTINTO del que tenemos guardado (p. ej. tu sistema ahora dice `"found"` y
  acá sigue `"active"`), **no se sobreescribe el estado en vivo**. Queda una
  señal pendiente en la cola de revisión interna — un revisor humano con
  capacidad `person:review` la confirma o la descarta desde el panel antes de
  que el cambio se refleje en el registro. No hay un plazo garantizado para
  esa revisión, y el resto de los campos del mismo envío (nombre, edad, etc.)
  se actualiza igual, de inmediato, aunque el status quede pendiente.
- Si el `status` que mandas coincide con el guardado, no hay nada que
  señalar — no se crea ninguna fila pendiente.
- Como se explica en "Respuesta" arriba, el endpoint no te dice si tu
  transición ya fue confirmada o sigue pendiente. Trata cualquier
  `status: "found"` que envíes como una señal, no como un hecho consumado del
  lado nuestro.

### Kill-switch por registro

El equipo puede bloquear una ficha específica tuya (`source` +
`externalId`) sin revocar tu llave completa. Un registro bloqueado así **no
vuelve a aparecer** aunque lo reenvíes — el upsert lo salta en silencio
(cuenta en `skipped`, la respuesta no distingue el motivo).

## Reglas

- **Solo staging mientras dure la fase de prueba.** Usa
  `https://api-staging.terremotocolombia.co`. No mandes datos reales de
  personas a este endpoint hasta que el mantenedor confirme por escrito que
  está listo para producción.
- **Nombres y datos de prueba obviamente falsos.** Para probar la integración
  usa nombres tipo `DEMO Persona de Prueba`, nunca nombres, documentos,
  teléfonos o fotos de personas reales — ni siquiera en staging.
