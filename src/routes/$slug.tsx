import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPublicLandingPageBySlug } from "@/lib/landing-pages.functions";
import { LandingRenderer } from "@/components/landing/LandingRenderer";

export const Route = createFileRoute("/$slug")({
  loader: async ({ params }) => {
    const page = await getPublicLandingPageBySlug({ data: { slug: params.slug } });
    if (!page) throw notFound();
    return { page };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Página não encontrada" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.page;
    const title = p.meta_title || p.titulo;
    const desc = p.meta_description || "";
    const og = p.meta_og_image || p.hero_image_url || undefined;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        ...(og
          ? [
              { property: "og:image", content: og },
              { name: "twitter:image", content: og },
            ]
          : []),
        { name: "twitter:card", content: og ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
    };
  },
  errorComponent: () => (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      Não foi possível carregar esta página.
    </div>
  ),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      Página não encontrada.
    </div>
  ),
  component: LandingPublicPage,
});

function LandingPublicPage() {
  const { page } = Route.useLoaderData();
  return <LandingRenderer page={page} />;
}
