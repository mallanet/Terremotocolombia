#!/usr/bin/env bash
# Verificación de jobs de fondo por FRESCURA DERIVADA (plan de port de colas,
# U7/KTD5): sin tabla nueva de job_runs, se comprueba lo que los jobs ya
# escriben. NO escribe nada en ningún entorno.
#
#   ./scripts/verify-jobs.sh staging
#   ./scripts/verify-jobs.sh production
#
# Con doppler configurado, añade el conteo de cartas muertas (SQL de solo
# lectura). Sin doppler, hace solo los checks HTTP.
set -euo pipefail

ENVIRONMENT="${1:-staging}"
case "$ENVIRONMENT" in
  staging) API="https://api-staging.terremotocolombia.co"; DOPPLER_CONFIG="stg" ;;
  production) API="https://api.terremotocolombia.co"; DOPPLER_CONFIG="prd" ;;
  *) echo "uso: $0 [staging|production]"; exit 2 ;;
esac

FALLOS=0
check() { # check <etiqueta> <ok?1:0> <detalle>
  if [ "$2" = "1" ]; then echo "PASS  $1 — $3"; else echo "FAIL  $1 — $3"; FALLOS=$((FALLOS+1)); fi
}

# 1. API viva.
code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 30 "$API/api/readyz" || echo 000)
check "API readyz" "$([ "$code" = "200" ] && echo 1 || echo 0)" "HTTP $code"

# 2. Cron de sismos: el catálogo debe tener actividad reciente (feed USGS cada
#    5 min; umbral generoso de 24 h para no dar falsos rojos en días quietos).
eq_json=$(curl -s --max-time 30 "$API/api/earthquakes?limit=1" || echo "")
eq_fresh=$(python3 - "$eq_json" <<'PY'
import json, sys, time
try:
    data = json.loads(sys.argv[1])
    items = data if isinstance(data, list) else data.get("items") or data.get("earthquakes") or []
    newest = max((e.get("time") or e.get("occurredAt") or 0) for e in items) if items else 0
    print(1 if newest and time.time() * 1000 - newest < 24 * 3600 * 1000 else 0)
except Exception:
    print(0)
PY
)
check "cron sismos (catálogo <24h)" "$eq_fresh" "último evento reciente: $eq_fresh"

# 3. Publicación de necesidades: SIN emergencia de ResponseGrid para Colombia
#    no hay prueba end-to-end posible — se declara, no se finge un PASS.
echo "INFO  publicación de necesidades — verificable solo hasta el borde (ENABLE_RESPONSEGRID off); la ruta de fallo→DLQ→audit_log se probó con mensaje sintético"

# 4. Cartas muertas (si hay doppler): deben ser 0 en régimen normal.
if command -v doppler >/dev/null 2>&1; then
  dlq=$(doppler run -p terremotocolombia-web -c "$DOPPLER_CONFIG" -- sh -c '
    node -e "
      const { Pool } = require(process.env.PWD + \"/backend/node_modules/pg\");
      (async () => {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, ssl: { rejectUnauthorized: false } });
        const r = await pool.query(\"select count(*)::int as n from audit_log where action = '\''queue.dead_letter'\''\");
        console.log(r.rows[0].n); await pool.end();
      })().catch(() => console.log(\"ERR\"));
    "' 2>/dev/null | tail -1)
  if [ "$dlq" = "ERR" ] || [ -z "$dlq" ]; then
    check "cartas muertas (audit_log)" 0 "no se pudo consultar"
  else
    check "cartas muertas (audit_log)" "$([ "$dlq" = "0" ] && echo 1 || echo 0)" "$dlq registradas (investigar en Auditoría si >0)"
  fi
else
  echo "INFO  cartas muertas — sin doppler en PATH, check omitido"
fi

if [ "$FALLOS" = "0" ]; then echo "VEREDICTO: verde"; else echo "VEREDICTO: $FALLOS fallo(s)"; exit 1; fi
