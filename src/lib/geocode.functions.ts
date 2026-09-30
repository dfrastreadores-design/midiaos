import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export const onlyDigits = (s: string) => String(s || "").replace(/\D/g, "");

export const formatCEP = (s: string) => {
  const d = onlyDigits(s).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
};

const GeocodeInputSchema = z.object({
  address: z.string().min(2).max(500),
});

const ReverseGeocodeInputSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

const CepInputSchema = z.object({
  cep: z.string().min(8).max(15),
});

/**
 * Geocodificação direta: transforma texto de endereço em coordenadas e detalhes
 */
export const geocodeAddress = createServerFn({ method: "POST" })
  .inputValidator((data) => GeocodeInputSchema.parse(data))
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gmapsKey = process.env.GOOGLE_MAPS_API_KEY;

    // 1. Tenta gateway do Google Maps se configurado
    if (lovableKey && gmapsKey) {
      try {
        const url = `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(data.address)}&language=pt-BR`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": gmapsKey,
          },
        });
        if (res.ok) {
          const json: any = await res.json();
          const first = json?.results?.[0];
          if (first) {
            const comps = first.address_components || [];
            const getComp = (type: string) =>
              comps.find((c: any) => c.types?.includes(type))?.long_name || "";
            const postal =
              comps.find((c: any) => c.types?.includes("postal_code"))?.long_name || "";
            const uf =
              comps.find((c: any) => c.types?.includes("administrative_area_level_1"))
                ?.short_name || "";

            return {
              ok: true as const,
              latitude: Number(first.geometry.location.lat),
              longitude: Number(first.geometry.location.lng),
              formatted: first.formatted_address as string,
              cep: postal ? formatCEP(postal) : null,
              logradouro: getComp("route") || null,
              bairro: getComp("sublocality_level_1") || getComp("neighborhood") || null,
              cidade: getComp("administrative_area_level_2") || getComp("locality") || null,
              uf: uf || null,
            };
          }
        }
      } catch (err) {
        console.warn("Fallback Google Maps para geocodeAddress:", err);
      }
    }

    // 2. Fallback público via OpenStreetMap (Nominatim)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(data.address)}&countrycodes=br&limit=1&addressdetails=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": "MidiaOS/1.0 (contato@midiaos.online)" },
      });
      if (res.ok) {
        const list = await res.json();
        const first = list?.[0];
        if (first) {
          const a = first.address || {};
          const road = a.road || a.pedestrian || a.suburb || "";
          const num = a.house_number ? `, ${a.house_number}` : "";
          const bairro = a.neighbourhood || a.suburb || "";
          const city = a.city || a.town || a.municipality || "";
          const uf = (a["ISO3166-2-lvl4"] || "").replace("BR-", "") || a.state || "";
          const cep = a.postcode ? formatCEP(a.postcode) : null;

          return {
            ok: true as const,
            latitude: Number(Number(first.lat).toFixed(7)),
            longitude: Number(Number(first.lon).toFixed(7)),
            formatted: first.display_name as string,
            cep,
            logradouro: road ? road + num : null,
            bairro: bairro || null,
            cidade: city || null,
            uf: uf || null,
          };
        }
      }
    } catch (err) {
      console.error("Erro na busca de endereço via Nominatim:", err);
    }

    return { ok: false as const, error: "Endereço não localizado no mapa" };
  });

/**
 * Geocodificação reversa: transforma coordenadas (lat, lng) em endereço legível e CEP
 */
export const reverseGeocodeCoords = createServerFn({ method: "POST" })
  .inputValidator((data) => ReverseGeocodeInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { latitude, longitude } = data;
    const lovableKey = process.env.LOVABLE_API_KEY;
    const gmapsKey = process.env.GOOGLE_MAPS_API_KEY;

    // 1. Tenta gateway do Google Maps se configurado
    if (lovableKey && gmapsKey) {
      try {
        const url = `${GATEWAY_URL}/maps/api/geocode/json?latlng=${latitude},${longitude}&language=pt-BR`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            "X-Connection-Api-Key": gmapsKey,
          },
        });
        if (res.ok) {
          const json: any = await res.json();
          const first = json?.results?.[0];
          if (first) {
            const comps = first.address_components || [];
            const getComp = (type: string) =>
              comps.find((c: any) => c.types?.includes(type))?.long_name || "";
            const postal =
              comps.find((c: any) => c.types?.includes("postal_code"))?.long_name || "";
            const uf =
              comps.find((c: any) => c.types?.includes("administrative_area_level_1"))
                ?.short_name || "";
            const route = getComp("route");
            const streetNumber = getComp("street_number");
            const neighborhood = getComp("sublocality_level_1") || getComp("neighborhood");
            const city = getComp("administrative_area_level_2") || getComp("locality");

            const parts: string[] = [];
            if (route) parts.push(route + (streetNumber ? `, ${streetNumber}` : ""));
            if (neighborhood) parts.push(neighborhood);
            if (city) parts.push(city + (uf ? `/${uf}` : ""));

            const endereco = parts.length > 0 ? parts.join(" — ") : first.formatted_address;

            return {
              ok: true as const,
              endereco,
              formatted: first.formatted_address as string,
              cep: postal ? formatCEP(postal) : null,
              logradouro: route || null,
              numero: streetNumber || null,
              bairro: neighborhood || null,
              cidade: city || null,
              uf: uf || null,
            };
          }
        }
      } catch (err) {
        console.warn("Fallback Google Maps para reverseGeocodeCoords:", err);
      }
    }

    // 2. Fallback público via OpenStreetMap (Nominatim)
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&addressdetails=1`;
      const res = await fetch(url, {
        headers: { "User-Agent": "MidiaOS/1.0 (contato@midiaos.online)" },
      });
      if (res.ok) {
        const d = await res.json();
        const a = d.address || {};
        const road = a.road || a.pedestrian || a.suburb || "";
        const num = a.house_number ? `, ${a.house_number}` : "";
        const bairro = a.neighbourhood || a.suburb || "";
        const city = a.city || a.town || a.municipality || "";
        const uf = (a["ISO3166-2-lvl4"] || "").replace("BR-", "") || a.state || "";
        const cep = a.postcode ? formatCEP(a.postcode) : null;

        const parts: string[] = [];
        if (road) parts.push(road + num);
        if (bairro && bairro !== road) parts.push(bairro);
        if (city) parts.push(city + (uf ? `/${uf}` : ""));

        const endereco = parts.length > 0 ? parts.join(" — ") : d.display_name || "";

        return {
          ok: true as const,
          endereco,
          formatted: (d.display_name || endereco) as string,
          cep,
          logradouro: road || null,
          numero: a.house_number || null,
          bairro: bairro || null,
          cidade: city || null,
          uf: uf || null,
        };
      }
    } catch (err) {
      console.error("Erro no reverse geocoding via Nominatim:", err);
    }

    return {
      ok: false as const,
      error: "Não foi possível obter o endereço para estas coordenadas",
    };
  });

/**
 * Consulta de CEP com coordenadas geográficas automáticas
 */
export const lookupCep = createServerFn({ method: "POST" })
  .inputValidator((data) => CepInputSchema.parse(data))
  .handler(async ({ data }) => {
    const digits = onlyDigits(data.cep);
    if (digits.length !== 8) {
      return { ok: false as const, error: "CEP deve conter 8 dígitos numéricos" };
    }

    let logradouro = "";
    let bairro = "";
    let cidade = "";
    let uf = "";
    let latitude: number | null = null;
    let longitude: number | null = null;

    // 1. Tenta BrasilAPI v2 (traz coordenadas geográficas)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`);
      if (res.ok) {
        const j = await res.json();
        logradouro = j.street || "";
        bairro = j.neighborhood || "";
        cidade = j.city || "";
        uf = j.state || "";
        const coords = j.location?.coordinates;
        if (coords?.latitude && coords?.longitude) {
          latitude = Number(Number(coords.latitude).toFixed(7));
          longitude = Number(Number(coords.longitude).toFixed(7));
        }
      }
    } catch (err) {
      console.warn("BrasilAPI CEP erro:", err);
    }

    // 2. Fallback para ViaCEP se dados principais faltarem
    if (!cidade) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        if (res.ok) {
          const j = await res.json();
          if (!j.erro) {
            logradouro = j.logradouro || "";
            bairro = j.bairro || "";
            cidade = j.localidade || "";
            uf = j.uf || "";
          }
        }
      } catch (err) {
        console.warn("ViaCEP erro:", err);
      }
    }

    if (!cidade && !logradouro) {
      return { ok: false as const, error: `CEP ${formatCEP(digits)} não encontrado.` };
    }

    // 3. Se coordenadas ainda não foram encontradas, geocodifica o endereço retornado
    if (latitude == null || longitude == null) {
      const query = [logradouro, bairro, cidade, uf, "Brasil"].filter(Boolean).join(", ");
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}&countrycodes=br&limit=1&addressdetails=1`,
          { headers: { "User-Agent": "MidiaOS/1.0 (contato@midiaos.online)" } },
        );
        if (res.ok) {
          const list = await res.json();
          if (list?.[0]) {
            latitude = Number(Number(list[0].lat).toFixed(7));
            longitude = Number(Number(list[0].lon).toFixed(7));
          }
        }
      } catch (err) {
        console.warn("Erro ao obter coordenadas para o CEP:", err);
      }
    }

    const parts: string[] = [];
    if (logradouro) parts.push(logradouro);
    if (bairro) parts.push(bairro);
    if (cidade) parts.push(cidade + (uf ? `/${uf}` : ""));

    return {
      ok: true as const,
      cep: formatCEP(digits),
      logradouro,
      bairro,
      cidade,
      uf,
      endereco: parts.join(" — "),
      latitude,
      longitude,
    };
  });
