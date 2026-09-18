import * as React from 'react'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text, Button,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  nome?: string
  variant?: 'expirando' | 'expirado'
  horasRestantes?: number
  linkPlanos?: string
  whatsapp?: string
}

export const TrialAlertaEmail = ({
  nome = 'Olá',
  variant = 'expirando',
  horasRestantes = 24,
  linkPlanos = 'https://midiaos.online/site/precos',
  whatsapp = 'https://wa.me/5561999999999',
}: Props) => {
  const expirando = variant === 'expirando'
  const title = expirando
    ? `Seu teste do mídia.OS termina em ${horasRestantes}h`
    : 'Seu teste do mídia.OS expirou'
  const intro = expirando
    ? `Faltam apenas ${horasRestantes} horas para o seu período de avaliação encerrar. Ative um plano agora e mantenha todos os dados, PIs e propostas que você já cadastrou.`
    : 'Seu período de 48h de teste chegou ao fim. Seus dados continuam salvos — ative um plano para retomar o acesso completo em minutos.'
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{title}</Heading>
          <Text style={text}>{nome},</Text>
          <Text style={text}>{intro}</Text>
          <Section style={btnContainer}>
            <Button style={button} href={linkPlanos}>Ver planos e ativar</Button>
          </Section>
          <Text style={text}>
            Prefere falar com um consultor? Fale no WhatsApp:{' '}
            <a href={whatsapp} style={link}>{whatsapp.replace('https://wa.me/', '+')}</a>
          </Text>
          <Hr style={hr} />
          <Text style={footer}>mídia.OS — Gestão comercial para veículos e agências</Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { margin: '0 auto', padding: '24px', maxWidth: '560px' }
const h1 = { color: '#0f172a', fontSize: '22px', fontWeight: 'bold' as const }
const text = { color: '#334155', fontSize: '15px', lineHeight: '24px' }
const btnContainer = { textAlign: 'center' as const, padding: '20px 0' }
const button = {
  backgroundColor: '#2563eb', borderRadius: '6px', color: '#fff',
  fontSize: '15px', textDecoration: 'none', padding: '12px 20px', display: 'inline-block',
}
const link = { color: '#2563eb' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0' }
const footer = { color: '#94a3b8', fontSize: '12px', textAlign: 'center' as const }

export const template = {
  component: TrialAlertaEmail,
  subject: (d: Props) =>
    d.variant === 'expirado'
      ? 'Seu teste do mídia.OS expirou — ative seu plano'
      : `Seu teste do mídia.OS termina em ${d.horasRestantes ?? 24}h`,
  displayName: 'Trial — expirando/expirado',
  previewData: { nome: 'Marina', variant: 'expirando', horasRestantes: 24 },
} satisfies TemplateEntry
