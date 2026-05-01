const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  // works with Gmail, Outlook and any standard SMTP provider
  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_PORT === '465',  // true only for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
}

async function send({ to, subject, html }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.log(`[email] SMTP not configured — would send to ${to}: "${subject}"`);
    return { skipped: true };
  }

  const info = await getTransporter().sendMail({
    from: `"CAD Flow" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

  return { messageId: info.messageId };
}

// ── HTML templates ────────────────────────────────────────────────────────────

function wrap(title, body) {
  return `
  <!DOCTYPE html><html lang="pt-BR">
  <head><meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background:#f4f4f4; margin:0; padding:0; }
    .container { max-width:600px; margin:30px auto; background:#fff; border-radius:8px; overflow:hidden; }
    .header { background:#1e3a5f; color:#fff; padding:24px 32px; }
    .header h1 { margin:0; font-size:20px; }
    .body { padding:28px 32px; color:#333; line-height:1.6; }
    .highlight { background:#f0f4ff; border-left:4px solid #1e3a5f; padding:12px 16px; margin:16px 0; border-radius:4px; }
    .badge { display:inline-block; padding:4px 12px; border-radius:12px; font-size:13px; font-weight:bold; }
    .status-requested    { background:#e8f4fd; color:#1565c0; }
    .status-in_progress  { background:#fff8e1; color:#f57f17; }
    .status-verification { background:#e8eaf6; color:#283593; }
    .status-approved     { background:#e8f5e9; color:#2e7d32; }
    .status-completed    { background:#e0f2f1; color:#00695c; }
    .status-hold         { background:#fce4ec; color:#c62828; }
    .footer { background:#f9f9f9; border-top:1px solid #eee; padding:16px 32px; font-size:12px; color:#999; }
  </style>
  </head>
  <body>
  <div class="container">
    <div class="header"><h1>CAD Flow — ${title}</h1></div>
    <div class="body">${body}</div>
    <div class="footer">Esta é uma mensagem automática do sistema CAD Flow. Não responda a este e-mail.</div>
  </div>
  </body></html>`;
}

function activityLink(id) {
  const base = process.env.APP_URL || 'http://localhost:5173';
  return `${base}/activities/${id}`;
}

function templates(activity, extra = {}) {
  const link    = activityLink(activity.id);
  const docNum  = activity.document_number || '(sem número)';
  const project = activity.project;
  const docType = activity.document_type;

  return {
    activity_assigned: {
      subject: `[CAD Flow] Atividade atribuída a você — ${project}`,
      html: wrap('Nova atividade atribuída', `
        <p>Olá <strong>${extra.recipientName}</strong>,</p>
        <p>Uma atividade foi atribuída a você:</p>
        <div class="highlight">
          <strong>Projeto:</strong> ${project}<br>
          <strong>Documento:</strong> ${docNum}<br>
          <strong>Tipo:</strong> ${docType}<br>
          <strong>Prazo planejado:</strong> ${extra.plannedDate || 'Não definido'}
        </div>
        <p><a href="${link}">Ver atividade no sistema →</a></p>
      `),
    },

    verification_requested: {
      subject: `[CAD Flow] Documento aguarda verificação — ${docNum}`,
      html: wrap('Documento aguarda verificação', `
        <p>Olá <strong>${extra.recipientName}</strong>,</p>
        <p>Um documento foi enviado para verificação e está aguardando sua análise:</p>
        <div class="highlight">
          <strong>Projeto:</strong> ${project}<br>
          <strong>Documento:</strong> ${docNum}<br>
          <strong>Tipo:</strong> ${docType}<br>
          <strong>Executor:</strong> ${extra.executorName || '—'}
        </div>
        <p><a href="${link}">Revisar documento →</a></p>
      `),
    },

    verification_rejected: {
      subject: `[CAD Flow] Verificação reprovada — ${docNum}`,
      html: wrap('Verificação reprovada', `
        <p>Olá <strong>${extra.recipientName}</strong>,</p>
        <p>Seu documento foi reprovado na verificação. Corrija os pontos indicados e reenvie.</p>
        <div class="highlight">
          <strong>Projeto:</strong> ${project}<br>
          <strong>Documento:</strong> ${docNum}<br>
          <strong>Tipo de erro:</strong> <span class="badge">${extra.errorCode || '—'}</span><br>
          <strong>Observação:</strong> ${extra.notes || '—'}
        </div>
        <p><a href="${link}">Ver detalhes e corrigir →</a></p>
      `),
    },

    verification_approved: {
      subject: `[CAD Flow] Documento aprovado — ${docNum}`,
      html: wrap('Documento aprovado', `
        <p>Olá <strong>${extra.recipientName}</strong>,</p>
        <p>O documento foi aprovado na verificação e está aguardando aprovação final.</p>
        <div class="highlight">
          <strong>Projeto:</strong> ${project}<br>
          <strong>Documento:</strong> ${docNum}<br>
          <strong>Tipo:</strong> ${docType}
        </div>
        <p><a href="${link}">Ver atividade →</a></p>
      `),
    },

    activity_hold: {
      subject: `[CAD Flow] Atividade suspensa (HOLD) — ${project}`,
      html: wrap('Atividade colocada em HOLD', `
        <p>Olá <strong>${extra.recipientName}</strong>,</p>
        <p>A atividade abaixo foi colocada em <strong>HOLD</strong>:</p>
        <div class="highlight">
          <strong>Projeto:</strong> ${project}<br>
          <strong>Documento:</strong> ${docNum}<br>
          <strong>Motivo:</strong> ${extra.notes || 'Não informado'}<br>
          <strong>Responsável:</strong> ${extra.changedByName || '—'}
        </div>
        <p><a href="${link}">Ver atividade →</a></p>
      `),
    },

    deadline_approaching: {
      subject: `[CAD Flow] Prazo se aproximando — ${project}`,
      html: wrap('Alerta de prazo', `
        <p>Olá <strong>${extra.recipientName}</strong>,</p>
        <p>Uma atividade sob sua responsabilidade está com o prazo próximo:</p>
        <div class="highlight">
          <strong>Projeto:</strong> ${project}<br>
          <strong>Documento:</strong> ${docNum}<br>
          <strong>Status:</strong> <span class="badge status-${activity.status}">${activity.status}</span><br>
          <strong>Prazo:</strong> ${extra.plannedDate}<br>
          <strong>Dias restantes:</strong> ${extra.daysLeft}
        </div>
        <p><a href="${link}">Ver atividade →</a></p>
      `),
    },
  };
}

module.exports = { send, templates };
