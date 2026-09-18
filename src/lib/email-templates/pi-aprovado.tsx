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
  Link,
  Button,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface PiAprovadoEmailProps {
  numeroPi?: string
  campanha?: string
  cliente?: string
  linkPi?: string
}

export const PiAprovadoEmail = ({
  numeroPi = '1234',
  campanha = 'Campanha Exemplo',
  cliente = 'Cliente Exemplo',
  linkPi = 'https://midiaos.online/pi?id=123',
}: PiAprovadoEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>PI {numeroPi} aprovado - {campanha}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>PI Aprovado</Heading>
          <Text style={text}>
            O Pedido de Inserção <strong>{numeroPi}</strong> foi aprovado e está pronto para programação.
          </Text>
          <Section style={section}>
            <Text style={text}>
              <strong>Campanha:</strong> {campanha}<br />
              <strong>Cliente:</strong> {cliente}
            </Text>
          </Section>
          <Section style={btnContainer}>
            <Button style={button} href={linkPi}>
              Ver Detalhes do PI
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
  component: PiAprovadoEmail,
  subject: (data: PiAprovadoEmailProps) => `PI ${data.numeroPi || ''} aprovado - ${data.campanha || ''}`,
  displayName: 'PI Aprovado (OPEC)',
  previewData: {
    numeroPi: '2024.001',
    campanha: 'Promoção de Verão',
    cliente: 'Lojas Americanas',
    linkPi: 'https://midiaos.online/pi/123',
  },
} satisfies TemplateEntry
