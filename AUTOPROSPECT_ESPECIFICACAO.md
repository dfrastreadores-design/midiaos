# AUTOPROSPECT ESPECIFICAÇÃO
## Ferramenta de Primeiro Contato Comercial Automatizado e Autorizado
**Módulo:** Midia OS Prospect — Componente Autoprospect  

---

## 1. VISÃO GERAL E OBJETIVO

O **Autoprospect** é o motor de execução outbound do Mídia OS. Sua função é transformar a inteligência de dados coletada sobre uma empresa em um primeiro contato comercial profissional, relevante e autorizado, monitorando respostas e transferindo imediatamente o lead aquecido ao executivo de vendas responsável.

---

## 2. NÍVEIS DE AUTONOMIA OPERACIONAL

O Master da empresa usuária define nas configurações (`prospect_settings`) o nível de autonomia permitido:

| Nível de Autonomia | Mecânica Operacional | Indicado Para |
| :--- | :--- | :--- |
| **1. Modo Assistido (Padrão)** | A IA redige a mensagem personalizada (WhatsApp, E-mail, Roteiro de Ligação), mas o executivo deve clicar explicitamente para aprovar e disparar. | Equipes que preferem controle total 1 a 1 de cada abordagem. |
| **2. Modo Supervisionado** | O sistema organiza lotes diários de abordagens qualificadas; o Master ou Gestor Comercial revisa e aprova o lote em 1 clique antes do envio. | Operações comerciais em escala com governança de diretoria. |
| **3. Modo Automatizado** | Envio automático respeitando rigorosamente: limites diários, horários comerciais (08:30 às 18:00), dias úteis e score mínimo de qualificação. | Campanhas recorrentes com alta qualificação prévia e templates oficiais. |

---

## 3. CICLO DE VIDA DO PRIMEIRO CONTATO

```
 [Empresa Qualificada (Score ≥ 70)]
                 │
                 ▼
 [Geração da Estratégia de Abordagem pela IA]
 ├─ Gancho comercial baseado no segmento e praça
 ├─ Proposta de valor personalizada (pontos de OOH aderentes)
 └─ Redação em tom consultivo e executivo (sem spam)
                 │
                 ▼
 [Aprovação Conforme Nível de Autonomia]
                 │
                 ▼
 [Disparo pelo Canal Autorizado]
 ├─ WhatsApp Business Cloud API (Número oficial)
 └─ E-mail Comercial com domínio próprio (SPF/DKIM)
                 │
                 ▼
 [Monitoramento de Resposta e Intenção]
 ├─ Resposta Neutra / Dúvida: IA sugere resposta e notifica executivo
 ├─ Demonstração de Interesse / Reunião: ALERTA P0 e TRANSFERÊNCIA IMEDIATA
 ├─ Pedido de Não-Contato / Opt-Out: BLOQUEIO IMEDIATO NA TABELA BLOCKLIST
 └─ Sem resposta após 3 toques: Encerramento do ciclo (Arquivado sem insistência)
```

---

## 4. CONTEÚDOS PRODUZIDOS PELA IA PARA CADA LEAD

Para cada empresa abordada, a IA do Autoprospect gera e disponibiliza na interface:
1. **Mensagem de WhatsApp (Curta e Direta)**:
   - Gancho baseado no segmento da empresa.
   - Apresentação da cobertura de mídia na mesma região onde a empresa atua.
   - Pergunta aberta de engajamento (Call-to-Action suave).
2. **E-mail Comercial (Apresentação Institucional)**:
   - Assunto atrativo e não apelativo.
   - Introdução executiva contextualizada.
   - Breve resumo de oportunidades na praça com métricas de audiência urbana.
   - Convite para uma conversa rápida de 10 minutos.
3. **Roteiro de Ligação Telefônica (Cold Call Estruturado)**:
   - Frase de abertura com quebra de padrão.
   - Pergunta filtro para identificar se a pessoa com quem fala é o decisor.
   - Argumento de valor focado no segmento do anunciante.
   - Respostas preparadas para as 3 principais objeções ("Já temos agência", "Não temos verba", "Mande por e-mail").
4. **Perguntas de Qualificação Rápida**:
   - Diagnóstico de raio de atração de clientes.
   - Principais períodos sazonais do segmento (ex.: Dia das Mães, Black Friday, Lançamentos).

---

## 5. TRANSFERÊNCIA AUTOMÁTICA PARA O EXECUTIVO (HAND-OFF)

A transferência da conversa para o ser humano ocorre de forma instantânea nas seguintes situações:
- O cliente responde à mensagem no WhatsApp ou responde ao e-mail.
- O cliente expressa qualquer intenção positiva ("Quero saber mais", "Quanto custa?", "Podem me ligar amanhã?").
- O cliente solicita envio de proposta comercial ou agendamento de reunião.

### Garantias do Hand-Off
- O histórico completo da abordagem e a identificação do ponto de mídia sugerido acompanham o lead.
- Uma notificação no sistema (sino de alertas) e um push/e-mail são enviados ao vendedor responsável.
- O lead assume o status `'em_conversa'` no Prospect e é refletido em tempo real no funil do CRM (`public.clientes`).

---

## 6. MECANISMOS DE PROTEÇÃO E GOVERNANÇA

1. **Lista de Bloqueio Instantânea (`prospect_blocklist`)**:
   - Respostas contendo "não quero", "pare", "remover", "spam" geram inclusão automática na blocklist e encerramento do diálogo.
2. **Controle de Frequência (Anti-Fadiga)**:
   - Intervalo mínimo de 3 dias úteis entre o toque 1 e o toque 2.
   - Limite absoluto de 3 tentativas de contato. Caso não haja resposta após o 3º toque, a empresa é arquivada como "sem resposta" e bloqueada para novas abordagens por 180 dias.
3. **Janela Operacional Segura**:
   - Disparos automáticos ocorrem exclusivamente de segunda a sexta-feira, das 08:30 às 18:00 (horário de Brasília).
   - Bloqueio completo em feriados nacionais e finais de semana.

