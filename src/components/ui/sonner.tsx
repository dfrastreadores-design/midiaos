import { Toaster as Sonner, toast } from "sonner";
import { traduzirErro } from "@/lib/error-translator";

// Intercepta toast.error para traduzir automaticamente mensagens técnicas de erro (PostgREST, Supabase, etc.) para Português
if (typeof window !== "undefined") {
  const originalError = toast.error;
  if (typeof originalError === "function" && !(toast as any).__translated) {
    (toast as any).__translated = true;
    toast.error = (message: any, data?: any) => {
      const translated = traduzirErro(message);
      if (data && typeof data.description === "string") {
        data = { ...data, description: traduzirErro(data.description) };
      }
      return originalError(translated, data);
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
