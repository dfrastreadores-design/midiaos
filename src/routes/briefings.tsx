import { createFileRoute } from "@tanstack/react-router";
import Briefings from "@/pages/Briefings";

export const Route = createFileRoute("/briefings")({
  head: () => ({ meta: [{ title: "Briefings — Mídia.OS" }] }),
  component: Briefings,
});
