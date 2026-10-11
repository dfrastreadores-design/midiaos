import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FolderSync,
  Loader2,
  Sparkles,
  Upload,
} from "lucide-react";

export interface ImportBatchOptionProps {
  onClick?: () => void;
  className?: string;
}

export function ImportBatchOption({ onClick, className }: ImportBatchOptionProps) {
  if (!onClick) return null;
  return (
    <DropdownMenuItem
      onClick={onClick}
      className={cn("gap-2.5 py-2 cursor-pointer", className)}
    >
      <Sparkles className="size-4 text-purple-600 shrink-0" />
      <div>
        <div className="font-medium text-xs">Importar Lote / Pasta (IA Gemini)</div>
        <div className="text-[10px] text-muted-foreground">
          Extrai parceiros e produtos de múltiplos PDFs e planilhas
        </div>
      </div>
    </DropdownMenuItem>
  );
}

export interface ImportMediaKitOptionProps {
  onClick?: () => void;
  className?: string;
}

export function ImportMediaKitOption({ onClick, className }: ImportMediaKitOptionProps) {
  if (!onClick) return null;
  return (
    <DropdownMenuItem
      onClick={onClick}
      className={cn("gap-2.5 py-2 cursor-pointer", className)}
    >
      <Sparkles className="size-4 text-indigo-600 shrink-0" />
      <div>
        <div className="font-medium text-xs">Importar Mídia Kit Individual (IA)</div>
        <div className="text-[10px] text-muted-foreground">
          Cadastra a partir de um PDF único ou proposta avulsa
        </div>
      </div>
    </DropdownMenuItem>
  );
}

export interface ImportSpreadsheetOptionProps {
  onClick?: () => void;
  className?: string;
}

export function ImportSpreadsheetOption({ onClick, className }: ImportSpreadsheetOptionProps) {
  if (!onClick) return null;
  return (
    <DropdownMenuItem
      onClick={onClick}
      className={cn("gap-2.5 py-2 cursor-pointer", className)}
    >
      <FileSpreadsheet className="size-4 text-emerald-600 shrink-0" />
      <div>
        <div className="font-medium text-xs">Importar Planilha Excel / CSV</div>
        <div className="text-[10px] text-muted-foreground">
          Upload direto de tabelas com mapeamento de colunas
        </div>
      </div>
    </DropdownMenuItem>
  );
}

export interface SyncGoogleDriveOptionProps {
  onClick?: () => void;
  isPending?: boolean;
  className?: string;
}

export function SyncGoogleDriveOption({
  onClick,
  isPending = false,
  className,
}: SyncGoogleDriveOptionProps) {
  if (!onClick) return null;
  return (
    <DropdownMenuItem
      onClick={onClick}
      disabled={isPending}
      className={cn("gap-2.5 py-2 cursor-pointer", className)}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin text-emerald-600 shrink-0" />
      ) : (
        <FolderSync className="size-4 text-emerald-600 shrink-0" />
      )}
      <div>
        <div className="font-medium text-xs">Sincronizar Google Drive</div>
        <div className="text-[10px] text-muted-foreground">
          Varre pastas compartilhadas na nuvem e atualiza dados
        </div>
      </div>
    </DropdownMenuItem>
  );
}

export interface DownloadTemplateOptionProps {
  onClick?: () => void;
  className?: string;
}

export function DownloadTemplateOption({ onClick, className }: DownloadTemplateOptionProps) {
  if (!onClick) return null;
  return (
    <DropdownMenuItem
      onClick={onClick}
      className={cn("gap-2.5 py-2 cursor-pointer", className)}
    >
      <Download className="size-4 text-slate-500 shrink-0" />
      <div>
        <div className="font-medium text-xs">Baixar Modelo Excel (.xlsx)</div>
        <div className="text-[10px] text-muted-foreground">
          Planilha padrão pré-formatada para preenchimento
        </div>
      </div>
    </DropdownMenuItem>
  );
}

export interface ImportDropdownProps {
  onImportBatch?: () => void;
  onImportMediaKit?: () => void;
  onImportSpreadsheet?: () => void;
  onSyncGoogleDrive?: () => void;
  onDownloadTemplate?: () => void;
  isSyncingDrive?: boolean;
  buttonLabel?: string;
  className?: string;
  align?: "start" | "center" | "end";
}

export function ImportDropdown({
  onImportBatch,
  onImportMediaKit,
  onImportSpreadsheet,
  onSyncGoogleDrive,
  onDownloadTemplate,
  isSyncingDrive = false,
  buttonLabel = "Importar Dados",
  className,
  align = "end",
}: ImportDropdownProps) {
  const hasAddContent = Boolean(onImportBatch || onImportMediaKit || onImportSpreadsheet);
  const hasSync = Boolean(onSyncGoogleDrive);
  const hasTemplates = Boolean(onDownloadTemplate);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "gap-2 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 font-medium shadow-xs",
            className
          )}
        >
          <Upload className="size-4 text-purple-600" />
          <span>{buttonLabel}</span>
          <ChevronDown className="size-3.5 opacity-60 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-72">
        {hasAddContent && (
          <>
            <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground px-2 py-1.5 flex items-center gap-1.5">
              <span>📥</span> Adicionar Conteúdo
            </DropdownMenuLabel>
            <ImportBatchOption onClick={onImportBatch} />
            <ImportMediaKitOption onClick={onImportMediaKit} />
            <ImportSpreadsheetOption onClick={onImportSpreadsheet} />
          </>
        )}

        {hasSync && (
          <>
            {hasAddContent && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground px-2 py-1.5 flex items-center gap-1.5">
              <span>☁️</span> Sincronização
            </DropdownMenuLabel>
            <SyncGoogleDriveOption
              onClick={onSyncGoogleDrive}
              isPending={isSyncingDrive}
            />
          </>
        )}

        {hasTemplates && (
          <>
            {(hasAddContent || hasSync) && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground px-2 py-1.5 flex items-center gap-1.5">
              <span>📄</span> Modelos
            </DropdownMenuLabel>
            <DownloadTemplateOption onClick={onDownloadTemplate} />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
