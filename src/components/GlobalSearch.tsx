import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Users,
  Building2,
  FileText,
  FileSignature,
  Package,
  Sparkles,
  ListTodo,
  ClipboardList,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { listClientes } from "@/lib/clientes.functions";
import { listAgencias } from "@/lib/agencias.functions";
import { listPis } from "@/lib/pi.functions";
import { listPropostas } from "@/lib/propostas.functions";
import { listProdutos } from "@/lib/produtos.functions";
import { listProjetos } from "@/lib/projetos.functions";
import { listTarefas } from "@/lib/tarefas.functions";
import { listBriefings } from "@/lib/briefings.functions";
import { cn } from "@/lib/utils";

// Normalize: lower-case + strip diacritics so "joao" matches "João"
function norm(v: unknown): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

type Hit = {
  id: string;
  group: "Clientes" | "Agências" | "Pedidos de Inserção" | "Propostas" | "Produtos" | "Projetos" | "Tarefas" | "Briefings";
  icon: React.ReactNode;
  title: string;
  subtitle?: string | null;
  to: string;
};

export function GlobalSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const fetchClientes = useServerFn(listClientes);
  const fetchAgencias = useServerFn(listAgencias);
  const fetchPis = useServerFn(listPis);
  const fetchPropostas = useServerFn(listPropostas);
  const fetchProdutos = useServerFn(listProdutos);
  const fetchProjetos = useServerFn(listProjetos);
  const fetchTarefas = useServerFn(listTarefas);
  const fetchBriefings = useServerFn(listBriefings);

  const qOpts = { staleTime: 60_000, enabled: open || q.length > 0 } as const;
  const { data: clientes = [] } = useQuery({ queryKey: ["gs-clientes"], queryFn: () => fetchClientes(), ...qOpts });
  const { data: agencias = [] } = useQuery({ queryKey: ["gs-agencias"], queryFn: () => fetchAgencias(), ...qOpts });
  const { data: pis = [] } = useQuery({ queryKey: ["gs-pis"], queryFn: () => fetchPis(), ...qOpts });
  const { data: propostas = [] } = useQuery({ queryKey: ["gs-propostas"], queryFn: () => fetchPropostas(), ...qOpts });
  const { data: produtos = [] } = useQuery({ queryKey: ["gs-produtos"], queryFn: () => fetchProdutos(), ...qOpts });
  const { data: projetos = [] } = useQuery({ queryKey: ["gs-projetos"], queryFn: () => fetchProjetos(), ...qOpts });
  const { data: tarefas = [] } = useQuery({ queryKey: ["gs-tarefas"], queryFn: () => fetchTarefas(), ...qOpts });
  const { data: briefings = [] } = useQuery({ queryKey: ["gs-briefings"], queryFn: () => fetchBriefings(), ...qOpts });

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Cmd/Ctrl+K to focus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const tokens = norm(q).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];
    const matchAll = (...fields: unknown[]) => {
      const hay = fields.map(norm).join(" ");
      return tokens.every((t) => hay.includes(t));
    };

    const out: Hit[] = [];
    for (const c of (clientes as any[])) {
      if (matchAll(c.razao_social, c.nome_fantasia, c.apelido, c.cnpj, c.cidade, c.uf)) {
        out.push({
          id: `cli-${c.id}`,
          group: "Clientes",
          icon: <Users className="size-4" />,
          title: c.razao_social ?? c.nome_fantasia ?? "—",
          subtitle: c.cnpj ?? c.nome_fantasia ?? null,
          to: "/clientes",
        });
      }
    }
    for (const a of (agencias as any[])) {
      if (matchAll(a.razao_social, a.nome_fantasia, a.apelido, a.cnpj, a.cidade, a.uf)) {
        out.push({
          id: `ag-${a.id}`,
          group: "Agências",
          icon: <Building2 className="size-4" />,
          title: a.razao_social ?? a.nome_fantasia ?? "—",
          subtitle: a.cnpj ?? a.nome_fantasia ?? null,
          to: "/agencias",
        });
      }
    }
    for (const p of (pis as any[])) {
      if (
        matchAll(
          p.numero,
          p.campanha,
          p.cliente?.razao_social,
          p.cliente?.nome_fantasia,
          p.agencia?.razao_social,
          p.agencia?.nome_fantasia,
        )
      ) {
        out.push({
          id: `pi-${p.id}`,
          group: "Pedidos de Inserção",
          icon: <FileText className="size-4" />,
          title: `PI ${p.numero ?? "—"}${p.campanha ? ` — ${p.campanha}` : ""}`,
          subtitle: p.cliente?.razao_social ?? p.cliente?.nome_fantasia ?? p.agencia?.razao_social ?? null,
          to: "/pi",
        });
      }
    }
    for (const pr of (propostas as any[])) {
      if (
        matchAll(
          pr.numero,
          pr.campanha,
          pr.titulo,
          pr.cliente?.razao_social,
          pr.cliente?.nome_fantasia,
          pr.agencia?.razao_social,
          pr.agencia?.nome_fantasia,
        )
      ) {
        out.push({
          id: `pr-${pr.id}`,
          group: "Propostas",
          icon: <FileSignature className="size-4" />,
          title: `Proposta ${pr.numero ?? "—"}${pr.campanha ?? pr.titulo ? ` — ${pr.campanha ?? pr.titulo}` : ""}`,
          subtitle: pr.cliente?.razao_social ?? pr.cliente?.nome_fantasia ?? pr.agencia?.razao_social ?? null,
          to: "/propostas",
        });
      }
    }
    for (const p of (produtos as any[])) {
      if (matchAll(p.nome, p.tipo, p.programa, p.formato, p.faixa)) {
        out.push({
          id: `prod-${p.id}`,
          group: "Produtos",
          icon: <Package className="size-4" />,
          title: p.nome ?? "—",
          subtitle: [p.tipo, p.programa, p.formato].filter(Boolean).join(" · ") || null,
          to: "/produtos",
        });
      }
    }
    for (const p of (projetos as any[])) {
      if (matchAll(p.nome, p.descricao, p.status)) {
        out.push({
          id: `prj-${p.id}`,
          group: "Projetos",
          icon: <Sparkles className="size-4" />,
          title: p.nome ?? "—",
          subtitle: p.status ?? null,
          to: "/projetos-especiais",
        });
      }
    }
    for (const t of (tarefas as any[])) {
      if (matchAll(t.titulo, t.descricao, t.status, t.prioridade)) {
        out.push({
          id: `tf-${t.id}`,
          group: "Tarefas",
          icon: <ListTodo className="size-4" />,
          title: t.titulo ?? "—",
          subtitle: [t.status, t.prioridade].filter(Boolean).join(" · ") || null,
          to: "/tarefas",
        });
      }
    }
    for (const b of (briefings as any[])) {
      if (matchAll(b.razao_social, b.nome_fantasia, b.campanha, b.cnpj, b.email, b.responsavel)) {
        out.push({
          id: `bf-${b.id}`,
          group: "Briefings",
          icon: <ClipboardList className="size-4" />,
          title: b.campanha ?? b.razao_social ?? b.nome_fantasia ?? "—",
          subtitle: b.razao_social ?? b.nome_fantasia ?? b.email ?? null,
          to: "/briefings",
        });
      }
    }
    return out.slice(0, 30);
  }, [q, clientes, agencias, pis, propostas, produtos, projetos, tarefas, briefings]);

  // Reset active row when results change
  useEffect(() => setActive(0), [q]);

  const grouped = useMemo(() => {
    const groups: Record<string, Hit[]> = {};
    for (const h of hits) (groups[h.group] ||= []).push(h);
    return groups;
  }, [hits]);

  const flat = hits;

  function go(hit: Hit) {
    setOpen(false);
    setQ("");
    navigate({ to: hit.to });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, Math.max(flat.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (flat[active]) {
        e.preventDefault();
        go(flat[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="flex-1 min-w-0 max-w-xl relative">
      <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        placeholder="Buscar clientes, PIs, propostas, produtos…  (Ctrl+K)"
        className="pl-9 pr-14 bg-muted/50 border-transparent focus-visible:bg-background sm:placeholder:text-sm w-full"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      <kbd className="hidden md:inline-flex absolute right-2 top-1/2 -translate-y-1/2 h-5 items-center gap-0.5 rounded border bg-background px-1.5 text-[10px] font-medium text-muted-foreground pointer-events-none">
        ⌘K
      </kbd>
      {open && q.trim() && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-[60vh] overflow-auto">
          {flat.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground">Nenhum resultado para “{q}”.</div>
          ) : (
            <div className="py-1">
              {Object.entries(grouped).map(([group, items]) => (
                <Section key={group} title={group}>
                  {items.map((h) => {
                    const idx = flat.indexOf(h);
                    return (
                      <Row
                        key={h.id}
                        icon={h.icon}
                        title={h.title}
                        subtitle={h.subtitle}
                        active={idx === active}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => go(h)}
                      />
                    );
                  })}
                </Section>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{title}</div>
      {children}
    </div>
  );
}

function Row({
  icon,
  title,
  subtitle,
  active,
  onClick,
  onMouseEnter,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string | null;
  active?: boolean;
  onClick: () => void;
  onMouseEnter?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
        active ? "bg-muted" : "hover:bg-muted/60",
      )}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm truncate">{title}</span>
        {subtitle && <span className="block text-xs text-muted-foreground truncate">{subtitle}</span>}
      </span>
    </button>
  );
}
