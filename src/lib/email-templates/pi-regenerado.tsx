import * as React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text, Button } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  nome?: string
  numeroPi?: string
  campanha?: string
  cliente?: string
  alteradoPor?: string
  linkPi?: string
}

export const PiRegeneradoEmail = ({
  nome = 'Olá',
  numeroPi = '1234',
  campanha = 'Campanha',
  cliente = 'Cliente',
  alteradoPor = 'Administrador',
  linkPi = 'https://midiaos.online/pi',
}: Props) => (
  <Html>
    <Head />
    <Preview>PI {numeroPi} atualizado — você é o novo executivo responsável</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>PI atualizado</Heading>
        <Text style={text}>Olá {nome},</Text>
        <Text style={text}>
          O Pedido de Inserção <strong>{numeroPi}</strong> foi reatribuído a você por <strong>{alteradoPor}</strong>.
          Um novo PDF foi gerado refletindo a mudança.
        </Text>
        <Section style={section}>
          <Text style={text}>
            <strong>Campanha:</strong> {campanha}<br />
            <strong>Cliente:</strong> {cliente}
          </Text>
        </Section>
        <Section style={btnContainer}>
          <Button style={button} href={linkPi}>Ver PI</Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>mídia.OS — Sistema de Gestão de Mídia</Text>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }
const container = { margin: '0 auto', padding: '20px 0 48px', width: '580px' }
const h1 = { color: '#333', fontSize: '24px', fontWeight: 'bold', paddingTop: '32px', textAlign: 'center' as const }
const text = { color: '#333', fontSize: '16px', lineHeight: '26px' }
const section = { padding: '12px 0' }
const btnContainer = { textAlign: 'center' as const, padding: '16px 0' }
const button = { backgroundColor: '#007bff', borderRadius: '3px', color: '#fff', fontSize: '16px', textDecoration: 'none', textAlign: 'center' as const, display: 'block', padding: '12px' }
const hr = { borderColor: '#cccccc', margin: '20px 0' }
const footer = { color: '#8898aa', fontSize: '12px' }

export const template = {
  component: PiRegeneradoEmail,
  subject: (d: Props) => `PI ${d.numeroPi || ''} reatribuído a você`,
  displayName: 'PI Reatribuído (troca de executivo)',
  previewData: {
    nome: 'Maria',
    numeroPi: '2024.001',
    campanha: 'Promoção de Verão',
    cliente: 'Lojas Americanas',
    alteradoPor: 'Admin',
    linkPi: 'https://midiaos.online/pi',
  },
} satisfies TemplateEntry
