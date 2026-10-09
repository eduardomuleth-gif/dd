/**
 * Plantillas oficiales de correo electrónico para Firebase Authentication
 * Proyecto: Security Urban — Comuna 8 (Villa Hermosa), Medellín
 *
 * NOTA TÉCNICA IMPORTANTE:
 * En Firebase Authentication, el asunto y el cuerpo HTML de los correos transaccionales
 * (Verificación de dirección de correo y Restablecimiento de contraseña) son enviados
 * directamente por los servidores de Google/Firebase y se administran desde:
 * Firebase Console -> Authentication -> Templates (Plantillas).
 *
 * Estas plantillas conservan la variable oficial `%LINK%` generada por Firebase Authentication
 * (nunca se reemplaza por enlaces inventados) e incluyen el parámetro `continueUrl` configurado
 * mediante `ActionCodeSettings` en `src/services/firebaseAuth.ts` para redirigir automáticamente
 * al usuario a la pantalla de inicio de sesión tras completar la acción.
 */

export interface FirebaseEmailTemplateSpec {
  id: 'verifyEmail' | 'resetPassword';
  consoleSectionName: string;
  senderName: string;
  subject: string;
  ctaButtonText: string;
  plainTextFallback: string;
  htmlTemplate: string;
}

export const SECURITY_URBAN_EMAIL_TEMPLATES: Record<'verifyEmail' | 'resetPassword', FirebaseEmailTemplateSpec> = {
  verifyEmail: {
    id: 'verifyEmail',
    consoleSectionName: 'Verificación de dirección de correo electrónico (Email address verification)',
    senderName: 'Security Urban • Comuna 8',
    subject: 'Verifica tu cuenta en Security Urban — Comuna 8 de Medellín',
    ctaButtonText: 'Verificar mi cuenta',
    plainTextFallback: `Hola %DISPLAY_NAME%,

Acabas de registrarte en Security Urban, la plataforma comunitaria de seguridad ciudadana y prevención de la Comuna 8 de Medellín.

Para completar tu proceso de registro y activar el acceso a tu cuenta, debes verificar tu dirección de correo electrónico haciendo clic en el siguiente enlace seguro ("Verificar mi cuenta"):

%LINK%

Después de verificar tu cuenta correctamente, serás redirigido automáticamente a la pantalla de inicio de sesión para ingresar con tus credenciales.

Si tú no realizaste este registro en Security Urban, puedes ignorar este mensaje con total tranquilidad; tu dirección de correo no será utilizada.

—
Security Urban • Red de Prevención y Seguridad Ciudadana
Comuna 8 (Villa Hermosa) • Medellín, Colombia`,
    htmlTemplate: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verifica tu cuenta en Security Urban</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0f172a;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#1e293b;border:1px solid #334155;border-radius:16px;overflow:hidden;">
          <!-- Barra superior de acento institucional -->
          <tr>
            <td style="height:6px;background:linear-gradient(90deg,#dc2626,#f59e0b);"></td>
          </tr>
          <!-- Encabezado de marca -->
          <tr>
            <td style="padding:28px 28px 16px 28px;text-align:left;border-bottom:1px solid #334155;">
              <span style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:rgba(220,38,38,0.15);border:1px solid rgba(220,38,38,0.4);color:#fca5a5;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
                COMUNA 8 • MEDELLÍN
              </span>
              <h1 style="margin:10px 0 4px 0;font-size:22px;font-weight:800;letter-spacing:0.5px;color:#ffffff;">
                SECURITY URBAN
              </h1>
              <p style="margin:0;font-size:13px;color:#94a3b8;">
                Plataforma Comunitaria de Seguridad Ciudadana y Prevención
              </p>
            </td>
          </tr>
          <!-- Cuerpo del mensaje -->
          <tr>
            <td style="padding:28px;font-size:15px;line-height:1.6;color:#e2e8f0;">
              <p style="margin:0 0 16px 0;font-size:16px;font-weight:600;color:#ffffff;">
                Hola %DISPLAY_NAME%,
              </p>
              <p style="margin:0 0 16px 0;">
                Acabas de registrarte en <strong>Security Urban</strong>. Para completar tu proceso de registro y activar el acceso a la plataforma comunitaria, es necesario verificar tu dirección de correo electrónico.
              </p>
              <p style="margin:0 0 24px 0;">
                Haz clic en el siguiente botón para confirmar tu correo:
              </p>
              <!-- Botón principal -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 24px auto;">
                <tr>
                  <td align="center" style="border-radius:999px;background-color:#dc2626;">
                    <a href="%LINK%" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">
                      Verificar mi cuenta
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Aviso de redirección automática -->
              <div style="margin:0 0 20px 0;padding:14px 16px;border-radius:12px;background-color:#0f172a;border:1px solid #334155;font-size:13px;color:#cbd5e1;">
                Después de verificar tu cuenta correctamente, serás redirigido automáticamente a la pantalla de inicio de sesión para ingresar con tus credenciales.
              </div>
              <p style="margin:0 0 12px 0;font-size:13px;color:#94a3b8;">
                Si el botón no funciona en tu dispositivo, copia y pega este enlace seguro en tu navegador:<br />
                <a href="%LINK%" style="color:#f87171;word-break:break-all;">%LINK%</a>
              </p>
              <p style="margin:20px 0 0 0;font-size:13px;color:#94a3b8;border-top:1px solid #334155;padding-top:16px;">
                Si no realizaste este registro en Security Urban, puedes ignorar este mensaje con total tranquilidad.
              </p>
            </td>
          </tr>
          <!-- Pie de página -->
          <tr>
            <td style="padding:18px 28px;background-color:#090d16;text-align:center;font-size:12px;color:#64748b;">
              <strong>Security Urban</strong> • Comuna 8 (Villa Hermosa), Medellín<br />
              Mensaje automático de seguridad ciudadana • Por favor no respondas a este correo.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },

  resetPassword: {
    id: 'resetPassword',
    consoleSectionName: 'Restablecimiento de contraseña (Password reset)',
    senderName: 'Security Urban • Comuna 8',
    subject: 'Restablece tu contraseña de Security Urban — Comuna 8 de Medellín',
    ctaButtonText: 'Restablecer mi contraseña',
    plainTextFallback: `Hola,

Recibimos una solicitud para recuperar la contraseña de tu cuenta en Security Urban (%EMAIL%), la plataforma de seguridad ciudadana de la Comuna 8 de Medellín.

Para continuar y crear una nueva contraseña segura, haz clic en el siguiente enlace ("Restablecer mi contraseña"):

%LINK%

Después de establecer tu nueva contraseña correctamente, serás redirigido automáticamente a la pantalla de inicio de sesión para acceder a tu cuenta.

Si tú no solicitaste el cambio de contraseña, puedes ignorar este correo; tu contraseña actual seguirá siendo válida y tu cuenta permanecerá protegida.

—
Security Urban • Red de Prevención y Seguridad Ciudadana
Comuna 8 (Villa Hermosa) • Medellín, Colombia`,
    htmlTemplate: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Restablece tu contraseña de Security Urban</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0f172a;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#1e293b;border:1px solid #334155;border-radius:16px;overflow:hidden;">
          <!-- Barra superior de acento institucional -->
          <tr>
            <td style="height:6px;background:linear-gradient(90deg,#dc2626,#f59e0b);"></td>
          </tr>
          <!-- Encabezado de marca -->
          <tr>
            <td style="padding:28px 28px 16px 28px;text-align:left;border-bottom:1px solid #334155;">
              <span style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:rgba(220,38,38,0.15);border:1px solid rgba(220,38,38,0.4);color:#fca5a5;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
                COMUNA 8 • MEDELLÍN
              </span>
              <h1 style="margin:10px 0 4px 0;font-size:22px;font-weight:800;letter-spacing:0.5px;color:#ffffff;">
                SECURITY URBAN
              </h1>
              <p style="margin:0;font-size:13px;color:#94a3b8;">
                Plataforma Comunitaria de Seguridad Ciudadana y Prevención
              </p>
            </td>
          </tr>
          <!-- Cuerpo del mensaje -->
          <tr>
            <td style="padding:28px;font-size:15px;line-height:1.6;color:#e2e8f0;">
              <p style="margin:0 0 16px 0;font-size:16px;font-weight:600;color:#ffffff;">
                Solicitud de recuperación de contraseña
              </p>
              <p style="margin:0 0 16px 0;">
                Se solicitó recuperar la contraseña asociada a la cuenta <strong>%EMAIL%</strong> en <strong>Security Urban</strong>.
              </p>
              <p style="margin:0 0 24px 0;">
                Haz clic en el siguiente botón para continuar y definir tu nueva contraseña:
              </p>
              <!-- Botón principal -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 24px auto;">
                <tr>
                  <td align="center" style="border-radius:999px;background-color:#dc2626;">
                    <a href="%LINK%" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">
                      Restablecer mi contraseña
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Aviso de redirección automática -->
              <div style="margin:0 0 20px 0;padding:14px 16px;border-radius:12px;background-color:#0f172a;border:1px solid #334155;font-size:13px;color:#cbd5e1;">
                Después de establecer una nueva contraseña correctamente, serás redirigido automáticamente a la pantalla de inicio de sesión.
              </div>
              <p style="margin:0 0 12px 0;font-size:13px;color:#94a3b8;">
                Si el botón no funciona en tu dispositivo, copia y pega este enlace seguro en tu navegador:<br />
                <a href="%LINK%" style="color:#f87171;word-break:break-all;">%LINK%</a>
              </p>
              <p style="margin:20px 0 0 0;font-size:13px;color:#94a3b8;border-top:1px solid #334155;padding-top:16px;">
                Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña actual permanecerá sin cambios.
              </p>
            </td>
          </tr>
          <!-- Pie de página -->
          <tr>
            <td style="padding:18px 28px;background-color:#090d16;text-align:center;font-size:12px;color:#64748b;">
              <strong>Security Urban</strong> • Comuna 8 (Villa Hermosa), Medellín<br />
              Mensaje automático de seguridad ciudadana • Por favor no respondas a este correo.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
};
