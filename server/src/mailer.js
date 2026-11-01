/**
 * Mailer Module - Nodemailer Configuration
 *
 * Configura el envío de correos electrónicos mediante SMTP.
 * No se conecta a SMTP hasta que esté configurado en .env
 *
 * IMPORTANTE:
 * - Las variables SMTP no se exponen nunca en los logs
 * - Se verifica que SMTP esté configurado antes de intentar enviar
 * - Los fallos de SMTP no eliminan tickets ni afectan la operación
 */

import nodemailer from 'nodemailer';
import logger from './logger.js';

let transporter = null;

export function initializeMailer() {
  // Check if SMTP is configured
  const smtpConfigured = !!(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.SMTP_FROM &&
    process.env.SUPPORT_EMAIL
  );

  if (!smtpConfigured) {
    logger.info('SMTP not configured. Email notifications disabled.');
    return;
  }

  try {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: parseInt(process.env.SMTP_PORT) === 465, // TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    logger.info('Mailer initialized successfully');
  } catch (e) {
    logger.error('Mailer initialization failed', { error: e.message });
    transporter = null;
  }
}

export async function sendAdminNotification(ticket) {
  if (!transporter) {
    logger.info('Mailer not available. Skipping admin notification.', { ticketId: ticket.ticket_id });
    return false;
  }

  try {
    const html = `
      <h2>Nuevo Ticket de Soporte</h2>
      <p><strong>Número de Seguimiento:</strong> ${ticket.ticket_id}</p>
      <p><strong>De:</strong> ${ticket.name} (${ticket.email})</p>
      <p><strong>Asunto:</strong> ${ticket.subject}</p>
      <p><strong>Mensaje:</strong></p>
      <pre>${ticket.message}</pre>
      <p><strong>Fecha:</strong> ${new Date(ticket.created_at).toLocaleString('es-ES')}</p>
      <p><a href="${process.env.ADMIN_PANEL_URL || 'http://localhost:5175'}/admin/tickets/${ticket.ticket_id}">Ver en Panel Admin</a></p>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.SUPPORT_EMAIL,
      subject: `[Nuevo Ticket] ${ticket.subject}`,
      html
    });

    logger.info('Admin notification sent', { ticketId: ticket.ticket_id });
    return true;
  } catch (e) {
    logger.error('Failed to send admin notification', { error: e.message, ticketId: ticket.ticket_id });
    return false;
  }
}

export async function sendClientResponse(ticket, response, clientEmail) {
  if (!transporter) {
    logger.info('Mailer not available. Skipping client response email.', { ticketId: ticket.ticket_id });
    return false;
  }

  try {
    const html = `
      <h2>Respuesta a Tu Solicitud de Soporte</h2>
      <p>Hola ${ticket.name},</p>
      <p>Hemos recibido tu solicitud y nuestro equipo ha preparado una respuesta:</p>
      <hr />
      <p><strong>Ticket de Referencia:</strong> ${ticket.ticket_id}</p>
      <p><strong>Tu Asunto:</strong> ${ticket.subject}</p>
      <p><strong>Respuesta:</strong></p>
      <p>${response.response_text}</p>
      <hr />
      <p>Si tienes más preguntas, puedes responder a este correo.</p>
      <p>Gracias por usar ReputationManager.</p>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: clientEmail,
      subject: `Re: ${ticket.subject}`,
      html
    });

    logger.info('Client response sent', { ticketId: ticket.ticket_id });
    return true;
  } catch (e) {
    logger.error('Failed to send client response', { error: e.message, ticketId: ticket.ticket_id });
    return false;
  }
}

export function isMailerConfigured() {
  return !!transporter;
}

export default {
  initializeMailer,
  sendAdminNotification,
  sendClientResponse,
  isMailerConfigured
};
