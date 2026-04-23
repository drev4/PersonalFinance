import env from '../config/env.js';

const FROM_ADDRESS = 'noreply@finanzas-app.com';
const APP_BASE_URL = process.env['APP_BASE_URL'] ?? 'http://localhost:3000';

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (env.NODE_ENV === 'test' || env.NODE_ENV === 'development') {
    console.info('[Email] (mock) Sending email:', { to, subject });
    console.info('[Email] (mock) Content:', html);
    return;
  }

  // Dynamic import to avoid loading Resend in test/dev if not needed
  const { Resend } = await import('resend');
  const resend = new Resend(process.env['RESEND_API_KEY'] ?? '');

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
  });

  if (error !== null && error !== undefined) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
): Promise<void> {
  const resetUrl = `${APP_BASE_URL}/reset-password?token=${resetToken}`;

  const html = `
    <h2>Restablecer contraseña</h2>
    <p>Has solicitado restablecer tu contraseña en Finanzas App.</p>
    <p>Haz clic en el siguiente enlace para continuar (válido por 1 hora):</p>
    <a href="${resetUrl}" style="background:#4F46E5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">
      Restablecer contraseña
    </a>
    <p>Si no solicitaste esto, ignora este correo.</p>
  `;

  await sendEmail(to, 'Restablecer contraseña - Finanzas App', html);
}

export async function sendEmailVerification(
  to: string,
  verificationToken: string,
): Promise<void> {
  const verifyUrl = `${APP_BASE_URL}/verify-email?token=${verificationToken}`;

  const html = `
    <h2>Verifica tu correo electrónico</h2>
    <p>Bienvenido a Finanzas App. Por favor verifica tu correo electrónico.</p>
    <p>Haz clic en el siguiente enlace para verificar tu cuenta:</p>
    <a href="${verifyUrl}" style="background:#4F46E5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">
      Verificar correo
    </a>
    <p>Si no creaste una cuenta, ignora este correo.</p>
  `;

  await sendEmail(to, 'Verifica tu correo - Finanzas App', html);
}

export async function sendBudgetAlert(
  to: string,
  data: {
    userName: string;
    budgetName: string;
    categoryName: string;
    percentageUsed: number;
    amountSpent: string;
    amountBudgeted: string;
  },
): Promise<void> {
  const isExceeded = data.percentageUsed > 100;
  const subject = isExceeded
    ? `Presupuesto excedido: ${data.categoryName} - Finanzas App`
    : `Alerta de presupuesto: ${data.categoryName} al ${data.percentageUsed.toFixed(0)}% - Finanzas App`;

  const html = `
    <h2>Alerta de presupuesto</h2>
    <p>Hola ${data.userName},</p>
    <p>
      Tu presupuesto <strong>${data.budgetName}</strong> en la categoría
      <strong>${data.categoryName}</strong> ha alcanzado el
      <strong>${data.percentageUsed.toFixed(1)}%</strong> de uso.
    </p>
    <table style="border-collapse:collapse;width:100%;max-width:400px;">
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;">Gastado</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;"><strong>${data.amountSpent}</strong></td>
      </tr>
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;">Presupuestado</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;"><strong>${data.amountBudgeted}</strong></td>
      </tr>
    </table>
    <p style="margin-top:16px;">
      ${isExceeded
        ? '<span style="color:#c62828;font-weight:bold;">Has superado tu presupuesto para esta categoría.</span>'
        : 'Revisa tus gastos para mantenerte dentro del presupuesto.'}
    </p>
    <a href="${APP_BASE_URL}/budgets" style="background:#1e3a5f;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:12px;">
      Ver presupuestos
    </a>
  `;

  await sendEmail(to, subject, html);
}

export async function sendMonthlyReportEmail(
  to: string,
  data: {
    userName: string;
    month: string;
    reportUrl: string;
    summary: { income: string; expenses: string; savingsRate: string };
  },
): Promise<void> {
  const html = `
    <h2>Tu informe mensual está listo</h2>
    <p>Hola ${data.userName},</p>
    <p>Tu informe financiero de <strong>${data.month}</strong> ya está disponible.</p>
    <table style="border-collapse:collapse;width:100%;max-width:400px;">
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;">Ingresos</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;color:#2e7d32;"><strong>${data.summary.income}</strong></td>
      </tr>
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;">Gastos</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;color:#c62828;"><strong>${data.summary.expenses}</strong></td>
      </tr>
      <tr>
        <td style="padding:8px;border:1px solid #e5e7eb;">Tasa de ahorro</td>
        <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;"><strong>${data.summary.savingsRate}</strong></td>
      </tr>
    </table>
    <a href="${data.reportUrl}" style="background:#1e3a5f;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:16px;">
      Descargar informe PDF
    </a>
  `;

  await sendEmail(to, `Informe mensual ${data.month} - Finanzas App`, html);
}

export async function sendGoalReachedEmail(
  to: string,
  data: {
    userName: string;
    goalName: string;
    targetAmount: string;
  },
): Promise<void> {
  const html = `
    <h2>¡Meta alcanzada!</h2>
    <p>Hola ${data.userName},</p>
    <p>
      Felicidades, has alcanzado tu meta financiera
      <strong>${data.goalName}</strong> de <strong>${data.targetAmount}</strong>.
    </p>
    <p>Sigue así para conseguir tus próximos objetivos.</p>
    <a href="${APP_BASE_URL}/goals" style="background:#2e7d32;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:12px;">
      Ver mis metas
    </a>
  `;

  await sendEmail(to, `¡Meta alcanzada: ${data.goalName}! - Finanzas App`, html);
}

export async function sendSyncErrorEmail(
  to: string,
  data: {
    userName: string;
    provider: string;
    errorMessage: string;
  },
): Promise<void> {
  const html = `
    <h2>Error de sincronización</h2>
    <p>Hola ${data.userName},</p>
    <p>
      Se ha producido un error al sincronizar con <strong>${data.provider}</strong>:
    </p>
    <p style="background:#fef2f2;border:1px solid #fecaca;padding:12px;border-radius:6px;color:#7f1d1d;">
      ${data.errorMessage}
    </p>
    <p>Por favor, revisa la configuración de tu integración.</p>
    <a href="${APP_BASE_URL}/integrations" style="background:#1e3a5f;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:12px;">
      Ver integraciones
    </a>
  `;

  await sendEmail(to, `Error de sincronización con ${data.provider} - Finanzas App`, html);
}
