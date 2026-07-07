import 'server-only'
import fs from 'fs/promises'
import path from 'path'
import nodemailer from 'nodemailer'
import { logger } from '@/lib/logger'

type EmailTemplate = 'auth-code' | 'auth-code-en'

let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter

  const smtpUrl = process.env.SMTP_URL
  if (!smtpUrl) return null

  transporter = nodemailer.createTransport(smtpUrl)
  return transporter
}

export async function sendEmail(
  to: string,
  subject: string,
  template: EmailTemplate,
  variables: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    const templatePath = path.join(process.cwd(), 'lib/email/templates', `${template}.html`)
    let html = await fs.readFile(templatePath, 'utf-8')

    for (const [key, value] of Object.entries(variables)) {
      html = html.replaceAll(`{{${key}}}`, value)
    }

    const transport = getTransporter()
    if (!transport) {
      logger.info('📧 Email (no SMTP)', { to, subject, variables })
      return { success: true }
    }

    await transport.sendMail({
      from: process.env.SMTP_FROM || 'noreply@qvor.ru',
      to,
      subject,
      html,
    })

    logger.info('📧 Email sent', { to, subject })
    return { success: true }
  } catch (error) {
    logger.error('Failed to send email', { error, to, subject })
    return { success: false, error: 'Failed to send email' }
  }
}

export async function sendAuthCode(email: string, code: string, lang: 'ru' | 'en' = 'ru') {
  const subject = lang === 'ru' ? 'Код авторизации QVOR' : 'QVOR Authorization Code'
  const template = lang === 'ru' ? 'auth-code' : 'auth-code-en'
  const year = new Date().getFullYear().toString()

  return sendEmail(email, subject, template as EmailTemplate, {
    CODE: code,
    YEAR: year,
  })
}
