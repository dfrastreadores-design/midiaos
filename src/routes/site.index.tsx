import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HeroSection } from "@/components/site/landing/HeroSection";
import { SegmentationSection } from "@/components/site/landing/SegmentationSection";
import { BeforeAfterSection } from "@/components/site/landing/BeforeAfterSection";
import { ModulesTechSection } from "@/components/site/landing/ModulesTechSection";
import { SocialProofSection } from "@/components/site/landing/SocialProofSection";
import { PricingSection } from "@/components/site/landing/PricingSection";
import { FaqSection } from "@/components/site/landing/FaqSection";
import { FinalCtaSection } from "@/components/site/landing/FinalCtaSection";
import { SystemDemoModal } from "@/components/site/landing/SystemDemoModal";

export const Route = createFileRoute("/site/")({
  head: () => ({
    meta: [
      {
        title:
          "MidiaOS — Gestão Inteligente para Veículos de Comunicação e Representações Comerciais",
      },
      {
        name: "description",
        content:
          "A plataforma definitiva para Veículos de Comunicação (TV, Rádio, Portais, OOH/DOOH) e Representações de Mídia. Gestão de inventário em tempo real, emissão de P.I. com assinatura eletrônica e cálculo automático de comissões.",
      },
      {
        property: "og:title",
        content: "MidiaOS — Tecnologia Especializada para Veículos de Mídia e Representações",
      },
      {
        property: "og:description",
        content:
          "Centralize reservas de espaço, emissão de propostas comerciais (P.I.), controle de grade, comissionamento e faturamento em uma única plataforma inteligente. Teste grátis por 48 horas.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.midiaos.online/site" },
      {
        name: "twitter:title",
        content: "MidiaOS — A Solução Definitiva para Gestão de Veículos e Representações",
      },
      {
        name: "twitter:description",
        content:
          "Elimine planilhas complexas e overbooking na grade de veiculação. Conheça o MidiaOS.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.midiaos.online/site" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "MidiaOS",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web, Android, iOS",
          description:
            "Sistema operacional para gestão comercial de veículos de comunicação (TV, Rádio, Portais, OOH) e empresas de representação comercial de mídia.",
          url: "https://www.midiaos.online/site",
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "BRL",
            lowPrice: "199",
            highPrice: "1499",
            offerCount: "3",
          },
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: "4.9",
            ratingCount: "38",
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "O MidiaOS atende emissoras de TV, rádios, portais e painéis OOH?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Sim, a plataforma é nativamente compatível com múltiplos formatos e canais de mídia em uma única conta unificada.",
              },
            },
            {
              "@type": "Question",
              name: "Como funciona para Empresas de Representação Comercial de Mídia?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "O MidiaOS possui arquitetura multi-veículo que calcula automaticamente os repasses líquidos para as emissoras e as comissões da equipe comercial.",
              },
            },
            {
              "@type": "Question",
              name: "A assinatura eletrônica de propostas e PIs possui validade jurídica?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Sim, atende integralmente à Medida Provisória nº 2.200-2/2001 e ao Código Civil Brasileiro, com carimbo de tempo, IP e hash criptográfico.",
              },
            },
          ],
        }),
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const [demoModalOpen, setDemoModalOpen] = useState(false);

  return (
    <div className="relative selection:bg-cyan-500 selection:text-slate-950">
      {/* 1. Hero Section com Headline, Mockup 3D e CTAs */}
      <HeroSection onOpenDemoModal={() => setDemoModalOpen(true)} />

      {/* 2. Segmentação Interativa (Veículos de Comunicação vs Representações) */}
      <SegmentationSection />

      {/* 3. Principais Dores Solucionadas (Antes vs Depois) */}
      <BeforeAfterSection />

      {/* 4. Módulos & Recursos Tecnológicos */}
      <ModulesTechSection />

      {/* 5. Prova Social e Números de Impacto */}
      <SocialProofSection />

      {/* 6. Planos e Tabela de Preços com Selo de Garantia */}
      <PricingSection />

      {/* 7. FAQ & Quebra de Objeções */}
      <FaqSection />

      {/* 8. Chamada Final e Conversão de Alto Impacto */}
      <FinalCtaSection />

      {/* Modal Interativo: Ver o Sistema por Dentro */}
      <SystemDemoModal open={demoModalOpen} onOpenChange={setDemoModalOpen} />
    </div>
  );
}
