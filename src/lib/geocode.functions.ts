import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

const InputSchema = z.object({
  address: z.string().min(3).max(500),
});

export const geocodeAddress = createServerFn({ method: "POST" })
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gmapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !gmapsKey) {
      return { ok: false as const, error: "Google Maps não configurado" };
    }
    const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(data.address)}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": gmapsKey,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      return { ok: false as const, error: `Falha na geocodificação (${res.status}): ${body.slice(0, 200)}` };
    }
    const json: any = await res.json();
    const first = json?.results?.[0];
    if (!first) return { ok: false as const, error: "Endereço não encontrado" };
    return {
      ok: true as const,
      latitude: first.geometry.location.lat as number,
      longitude: first.geometry.location.lng as number,
      formatted: first.formatted_address as string,
    };
  });
