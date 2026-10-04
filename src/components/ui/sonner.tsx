import { Toaster as Sonner, toast } from "sonner";
import { traduzirErro } from "@/lib/error-translator";

// Intercepta toast.error para traduzir automaticamente mensagens técnicas de erro (PostgREST, Supabase, etc.) para Português
if (typeof window !== "undefined") {
  const originalError = toast.error;
  if (typeof originalError === "function" && !(toast as any).__translated) {
    (toast as any).__translated = true;
    toast.error = (message: any, data?: any) => {
      const translated = traduzirErro(message);
      let updatedData = data;
      if (updatedData && typeof updatedData.description === "string") {
        updatedData = { ...updatedData, description: traduzirErro(updatedData.description) };
      }
      if (
        typeof translated === "string" &&
        translated.toLowerCase().includes("sessão de acesso expirou")
      ) {
        window.dispatchEvent(new CustomEvent("midiaos:session-expired"));
        updatedData = {
          ...updatedData,
          action: {
            label: "Fazer Login",
            onClick: () => {
              window.location.href = "/login";
            },
          },
          duration: 10000,
        };
      }
      return originalError(translated, updatedData);
    };
  }
}

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
