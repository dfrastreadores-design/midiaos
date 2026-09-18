import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Button,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface PiPendenteAprovacaoEmailProps {
  numeroPi?: string
  campanha?: string
  cliente?: string
  executivo?: string
  linkPi?: string
}

export const PiPendenteAprovacaoEmail = ({
  numeroPi = '1234',
  campanha = 'Campanha Exemplo',
  cliente = 'Cliente Exemplo',
  executivo = 'Executivo Exemplo',
  linkPi = 'https://midiaos.online/pi?id=123',
}: PiPendenteAprovacaoEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>PI {numeroPi} aguardando sua aprovação</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Aprovação Pendente</Heading>
          <Text style={text}>
            Um novo Pedido de Inserção foi enviado para sua aprovação.
          </Text>
          <Section style={section}>
            <Text style={text}>
              <strong>PI:</strong> {numeroPi}<br />
              <strong>Campanha:</strong> {campanha}<br />
              <strong>Cliente:</strong> {cliente}<br />
              <strong>Executivo:</strong> {executivo}
            </Text>
          </Section>
          <Section style={btnContainer}>
            <Button style={button} href={linkPi}>
              Analisar e Aprovar PI
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Mídia.OS — Sistema de Gestão de Mídia
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '580px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  paddingTop: '32px',
  textAlign: 'center' as const,
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
}

const section = {
  padding: '12px 0',
}

const btnContainer = {
  textAlign: 'center' as const,
  padding: '16px 0',
}

const button = {
  backgroundColor: '#007bff',
  borderRadius: '3px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
}

const hr = {
  borderColor: '#cccccc',
  margin: '20px 0',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
}

export const template = {
  component: PiPendenteAprovacaoEmail,
  subject: (data: PiPendenteAprovacaoEmailProps) => `Aprovação Pendente: PI ${data.numeroPi || ''} - ${data.campanha || ''}`,
  displayName: 'PI Pendente Aprovação (Diretoria)',
  previewData: {
    numeroPi: '2024.002',
    campanha: 'Black Friday',
    cliente: 'Coca-Cola',
    executivo: 'João Silva',
    linkPi: 'https://midiaos.online/pi/456',
  },
} satisfies TemplateEntry
