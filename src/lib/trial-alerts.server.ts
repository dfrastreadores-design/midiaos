import * as React from 'react'
import { render } from '@react-email/render'
import { supabaseAdmin } from '@/integrations/supabase/client.server'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'mídia.OS'
const SENDER_DOMAIN = 'notify.midiaos.online'
const FROM_DOMAIN = 'midiaos.online'
const WHATS = 'https://wa.me/5561999999999'
const APP_URL = 'https://midiaos.online'

export type TrialVariant = 'expirando' | 'expirado'

/** Enfileira um email transacional pré-renderizado (sem exigir JWT do usuário). */
export async function enqueueTrialEmail(params: {
  recipient: string
  nome: string
  variant: TrialVariant
  horasRestantes: number
  idempotencyKey: string
}) {
  const template = TEMPLATES['trial-alerta']
  if (!template) return { ok: false, error: 'template ausente' as const }

  // Respeita a lista de suprimidos
  const { data: sup } = await supabaseAdmin
    .from('suppressed_emails').select('id').eq('email', params.recipient.toLowerCase()).maybeSingle()
  if (sup) return { ok: false, error: 'suppressed' as const }

  const templateData = {
    nome: params.nome,
    variant: params.variant,
    horasRestantes: params.horasRestantes,
    linkPlanos: `${APP_URL}/site/precos`,
    whatsapp: WHATS,
  }
  const element = React.createElement(template.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject = typeof template.subject === 'function' ? template.subject(templateData) : template.subject

  const messageId = params.idempotencyKey
  await supabaseAdmin.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'trial-alerta',
    recipient_email: params.recipient,
    status: 'pending',
  })

  const { error } = await supabaseAdmin.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: params.recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: 'trial-alerta',
      idempotency_key: params.idempotencyKey,
      queued_at: new Date().toISOString(),
    },
  })
  if (error) {
    await supabaseAdmin.from('email_send_log').insert({
      message_id: messageId,
      template_name: 'trial-alerta',
      recipient_email: params.recipient,
      status: 'failed',
      error_message: error.message,
    })
    return { ok: false as const, error: error.message }
  }
  return { ok: true as const }
}

/**
 * Cria notificações + emails para usuários com trial prestes a expirar / expirado.
 * Dedupe garantido pelo índice único parcial em notificacoes(metadata.ref_id, evento)
 * e pelo message_id no email_send_log.
 */
export async function processarAlertasTrial() {
  const now = Date.now()
  const in48h = new Date(now + 48 * 3600 * 1000).toISOString()
  const from7dAgo = new Date(now - 7 * 24 * 3600 * 1000).toISOString()

  const { data: profs } = await supabaseAdmin
    .from('profiles')
    .select('id, email, nome, trial_ends_at')
    .not('trial_ends_at', 'is', null)
    .gte('trial_ends_at', from7dAgo)
    .lte('trial_ends_at', in48h)

  let notif = 0
  let emails = 0
  for (const p of profs ?? []) {
    if (!p.trial_ends_at || !p.email) continue
    const endMs = new Date(p.trial_ends_at).getTime()
    const horas = Math.round((endMs - now) / 3600000)

    let variant: TrialVariant | null = null
    let evento = ''
    let horasEvento = 0
    if (horas <= 0 && horas >= -168) {
      variant = 'expirado'; evento = 'trial-expirado'; horasEvento = 0
    } else if (horas > 0 && horas <= 6) {
      variant = 'expirando'; evento = 'trial-6h'; horasEvento = 6
    } else if (horas > 6 && horas <= 24) {
      variant = 'expirando'; evento = 'trial-24h'; horasEvento = 24
    }
    if (!variant) continue

    const titulo = variant === 'expirado'
      ? 'Seu teste expirou — ative um plano para continuar'
      : `Seu teste termina em ${horasEvento}h`
    const mensagem = variant === 'expirado'
      ? 'Ative um plano em minutos e recupere o acesso aos seus dados.'
      : 'Ative um plano agora e mantenha tudo o que já cadastrou no mídia.OS.'

    const rNotif = await supabaseAdmin.from('notificacoes').insert({
      user_id: p.id,
      tipo: 'outro' as const,
      titulo,
      mensagem,
      link: '/site/precos',
      metadata: { ref_id: p.id, evento, whatsapp: WHATS } as never,
    })
    if (!rNotif.error) notif++

    const r = await enqueueTrialEmail({
      recipient: p.email,
      nome: p.nome || 'Olá',
      variant,
      horasRestantes: horasEvento,
      idempotencyKey: `trial-${p.id}-${evento}`,
    })
    if (r.ok) emails++
  }
  return { notif, emails }
}
