/**
 * Envío de emails de invitación por SMTP (motor estándar de invitaciones). OPCIONAL: sin
 * SMTP_HOST configurado, `sendInvitationEmail` devuelve {sent:false} y el caller
 * expone el link en la respuesta (flujo dev). En prod con SMTP, manda el correo.
 */
import nodemailer from "nodemailer";
import { env } from "@/config/env";
// Identidad real del despliegue (se inlinea en el bundle). El nombre del
// producto en los emails sale de aquí, NUNCA hardcodeado: un email de
// activación con una marca desconocida parece phishing. Ver CLAUDE.md →
// "No inventes identidad".
import deployment from "../../../config/deployment.config.json";

const PRODUCT_NAME: string = deployment.productName;

let _transport: nodemailer.Transporter | null = null;

function transport(): nodemailer.Transporter | null {
  if (!env.SMTP_HOST) return null;
  if (_transport) return _transport;
  _transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465, // 465 = TLS implícito; 587 = STARTTLS
    auth: env.SMTP_USERNAME ? { user: env.SMTP_USERNAME, pass: env.SMTP_PASSWORD } : undefined,
  });
  return _transport;
}

/**
 * Construye el link de aceptación de invitación. La página /invite/<token>
 * vive en el PANEL ADMIN (admin/app/invite/[token]), no en el sitio público:
 * sin ADMIN_BASE_URL configurada, el link emailado apuntaría a un 404.
 */
export function inviteUrl(token: string): string {
  const base = (env.ADMIN_BASE_URL || env.APP_BASE_URL).replace(/\/$/, "");
  return `${base}/invite/${token}`;
}

/**
 * Manda el email de invitación. Devuelve {sent} para que el caller decida si
 * exponer el link en la respuesta (cuando no hay SMTP, p.ej. dev).
 */
export async function sendInvitationEmail(to: string, token: string): Promise<{ sent: boolean }> {
  const t = transport();
  const url = inviteUrl(token);
  if (!t) return { sent: false };

  await t.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: `Te invitaron al panel de ${PRODUCT_NAME}`,
    text: `Has sido invitado al panel de administración de ${PRODUCT_NAME}.\n\nActiva tu cuenta aquí (expira pronto):\n${url}\n\nSi no esperabas esto, ignora este correo.`,
    html: `<p>Has sido invitado al panel de administración de <strong>${PRODUCT_NAME}</strong>.</p>
<p><a href="${url}">Activa tu cuenta aquí</a> (el enlace expira pronto).</p>
<p style="color:#666;font-size:12px">Si no esperabas esto, ignora este correo.</p>`,
  });
  return { sent: true };
}

/**
 * Mensaje del equipo a un voluntario (desde el panel admin). Texto plano a
 * propósito: el cuerpo lo escribe una persona del equipo y NO se renderiza
 * como HTML (evita inyección de markup en el correo). {sent:false} si no hay
 * SMTP configurado — el caller decide el error visible.
 */
export async function sendVolunteerMessage(
  to: string,
  subject: string,
  message: string,
): Promise<{ sent: boolean }> {
  const t = transport();
  if (!t) return { sent: false };
  await t.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: `[${PRODUCT_NAME}] ${subject}`,
    text: `${message}\n\n— Equipo de ${PRODUCT_NAME}`,
  });
  return { sent: true };
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Correo de bienvenida + asignación de tarea a un voluntario, con la marca
 * Mallanet (logo servido por el sitio) y los puntos del traslado con sus
 * coordenadas exactas. El botón lleva a /voluntariado/<token>, la página
 * pública con el mapa y los botones de respuesta. Todo dato interpolado va
 * escapado (lo escriben admins en el panel). {sent:false} si no hay SMTP.
 */
export async function sendVolunteerAssignmentEmail(
  to: string,
  input: {
    volunteerName: string;
    task: {
      title: string;
      description: string;
      kind: string;
      city: string | null;
      originName: string | null;
      originLat: number | null;
      originLng: number | null;
      destName: string | null;
      destLat: number | null;
      destLng: number | null;
      transportNote: string | null;
    };
    assignmentUrl: string;
  },
): Promise<{ sent: boolean }> {
  const t = transport();
  if (!t) return { sent: false };
  const { task, volunteerName, assignmentUrl } = input;
  const logoUrl = `${env.APP_BASE_URL.replace(/\/$/, "")}/icon-192.png`;

  const legs: string[] = [];
  if (task.originName) {
    legs.push(
      `<li><strong>Recoger en:</strong> ${escapeHtml(task.originName)}` +
        (task.originLat !== null && task.originLng !== null
          ? ` <span style="color:#666">(${task.originLat.toFixed(5)}, ${task.originLng.toFixed(5)})</span>`
          : "") +
        `</li>`,
    );
  }
  if (task.destName) {
    legs.push(
      `<li><strong>Entregar en:</strong> ${escapeHtml(task.destName)}` +
        (task.destLat !== null && task.destLng !== null
          ? ` <span style="color:#666">(${task.destLat.toFixed(5)}, ${task.destLng.toFixed(5)})</span>`
          : "") +
        `</li>`,
    );
  }
  const legsHtml = legs.length > 0 ? `<ul style="padding-left:18px">${legs.join("")}</ul>` : "";
  const legsText = [
    task.originName
      ? `Recoger en: ${task.originName}${task.originLat !== null ? ` (${task.originLat.toFixed(5)}, ${task.originLng?.toFixed(5)})` : ""}`
      : null,
    task.destName
      ? `Entregar en: ${task.destName}${task.destLat !== null ? ` (${task.destLat.toFixed(5)}, ${task.destLng?.toFixed(5)})` : ""}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  await t.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: `Bienvenida al equipo de voluntarios — tu asignación: ${task.title}`,
    text:
      `Hola ${volunteerName}, bienvenida/o al equipo de voluntarios de ${PRODUCT_NAME}.\n\n` +
      `Tu asignación: ${task.title} (${task.kind}${task.city ? `, ${task.city}` : ""})\n` +
      (task.description ? `${task.description}\n` : "") +
      (legsText ? `\n${legsText}\n` : "") +
      (task.transportNote ? `\nTransporte: ${task.transportNote}\n` : "") +
      `\nAbre tu enlace para ver el mapa con los puntos exactos y responder (aceptar / no puedo / terminada):\n${assignmentUrl}\n`,
    html: `
<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <div style="text-align:center;padding:16px 0">
    <img src="${logoUrl}" alt="${escapeHtml(PRODUCT_NAME)}" width="64" height="64" style="border-radius:12px" />
  </div>
  <h1 style="font-size:18px;color:#003893">Bienvenida/o al equipo de voluntarios</h1>
  <p>Hola ${escapeHtml(volunteerName)}, gracias por sumarte a ${escapeHtml(PRODUCT_NAME)}. Tienes una asignación:</p>
  <div style="border:1px solid #e2e2e2;border-radius:12px;padding:16px;margin:16px 0">
    <p style="margin:0 0 4px"><strong>${escapeHtml(task.title)}</strong>
      <span style="color:#666">(${escapeHtml(task.kind)}${task.city ? `, ${escapeHtml(task.city)}` : ""})</span></p>
    ${task.description ? `<p style="margin:8px 0">${escapeHtml(task.description)}</p>` : ""}
    ${legsHtml}
    ${task.transportNote ? `<p style="margin:8px 0"><strong>Transporte:</strong> ${escapeHtml(task.transportNote)}</p>` : ""}
  </div>
  <p style="text-align:center;margin:24px 0">
    <a href="${assignmentUrl}" style="background:#003893;color:#fff;padding:12px 24px;border-radius:9999px;text-decoration:none;font-weight:600">Ver mi asignación y el mapa</a>
  </p>
  <p style="color:#666;font-size:12px">Desde ese enlace puedes aceptar, indicar que no puedes, o marcar la tarea como terminada. Si no esperabas este correo, ignóralo.</p>
</div>`,
  });
  return { sent: true };
}

/**
 * Manda el código OTP de recuperación de contraseña. {sent:false} si no hay SMTP
 * (dev) — el caller NO debe exponer el código en la respuesta (a diferencia del
 * invite link): un OTP en la respuesta anularía la prueba de posesión del email.
 */
export async function sendPasswordResetEmail(to: string, code: string): Promise<{ sent: boolean }> {
  const t = transport();
  if (!t) {
    // Dev sin SMTP: lo logueamos a stderr para poder probar el flujo localmente.
    console.log(`[mailer] (dev, sin SMTP) OTP de reset para ${to}: ${code}`);
    return { sent: false };
  }
  await t.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: "Código para restablecer tu contraseña",
    text: `Tu código para restablecer la contraseña es: ${code}\n\nCaduca en 15 minutos. Si no lo pediste, ignora este correo.`,
    html: `<p>Tu código para restablecer la contraseña es:</p>
<p style="font-size:24px;font-weight:bold;letter-spacing:3px">${code}</p>
<p style="color:#666;font-size:12px">Caduca en 15 minutos. Si no lo pediste, ignora este correo.</p>`,
  });
  return { sent: true };
}
