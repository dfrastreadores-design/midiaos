import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, FileUp, Sparkles, AlertCircle } from "lucide-react";
import { extractPdfText } from "@/lib/pdf-extract";
import { extrairPiDePdf, type PiExtraido } from "@/lib/pi-ai.functions";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onExtracted: (data: PiExtraido) => void;
};

export function ImportarPiPdfDialog({ open, onOpenChange, onExtracted }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<string>("");
  const [isHistorico, setIsHistorico] = useState(false);
  const [manualValues, setManualValues] = useState({ bruto: "", liquido: "" });
  const [showManualFields, setShowManualValues] = useState(false);

  async function handleExtract() {
    if (!file) return;
    setLoading(true);
    try {
      setStep("Lendo o PDF…");
      const texto = await extractPdfText(file);
      if (texto.length < 20) throw new Error("Não foi possível ler o texto do PDF.");
      setStep("IA extraindo os dados…");
      const data = await extrairPiDePdf({ data: { texto } });

      const updatedData = { ...data };
      if (isHistorico) {
        if (showManualFields) {
          updatedData.valor_bruto =
            Number(manualValues.bruto.replace(",", ".")) || data.valor_bruto;
          updatedData.valor_liquido =
            Number(manualValues.liquido.replace(",", ".")) || data.valor_liquido;
          updatedData.valor_negociado = updatedData.valor_liquido || updatedData.valor_bruto;
        }

        if (!updatedData.valor_bruto && !updatedData.valor_liquido && !showManualFields) {
          setShowManualValues(true);
          toast.warning("Valores não reconhecidos. Por favor, informe-os manualmente.");
          setLoading(false);
          return;
        }
      }

      toast.success("Dados extraídos com sucesso");
      onExtracted(updatedData);
      onOpenChange(false);
      setFile(null);
      setShowManualValues(false);
      setManualValues({ bruto: "", liquido: "" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
      setStep("");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!loading) onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" /> Importar PI por PDF
          </DialogTitle>
          <DialogDescription>
            Envie um PI em PDF. A IA vai ler e pré-preencher o formulário para você revisar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Arquivo PDF</Label>
            <Input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={loading}
            />
            {file && (
              <div className="text-xs text-muted-foreground">
                {file.name} · {(file.size / 1024).toFixed(0)} KB
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 rounded-md border p-3 bg-muted/20">
            <Checkbox
              id="is-historico"
              checked={isHistorico}
              onCheckedChange={(v) => setIsHistorico(!!v)}
            />
            <div className="grid gap-1.5 leading-none">
              <label
                htmlFor="is-historico"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Apenas para histórico
              </label>
              <p className="text-[11px] text-muted-foreground">
                Tenta reconhecer valores bruto/líquido para registro.
              </p>
            </div>
          </div>

          {showManualFields && (
            <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-amber-800 font-medium text-sm mb-1">
                <AlertCircle className="size-4" />
                Valores não detectados
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor Bruto (R$)</Label>
                  <Input
                    placeholder="0,00"
                    value={manualValues.bruto}
                    onChange={(e) =>
                      setManualValues((prev) => ({
                        ...prev,
                        bruto: e.target.value.replace(/[^\d.,]/g, ""),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor Líquido (R$)</Label>
                  <Input
                    placeholder="0,00"
                    value={manualValues.liquido}
                    onChange={(e) =>
                      setManualValues((prev) => ({
                        ...prev,
                        liquido: e.target.value.replace(/[^\d.,]/g, ""),
                      }))
                    }
                  />
                </div>
              </div>
              <p className="text-[10px] text-amber-700">
                A IA não conseguiu identificar os valores no documento. Informe-os para prosseguir.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> {step}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleExtract} disabled={!file || loading}>
            <FileUp className="size-4 mr-2" /> Extrair com IA
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
