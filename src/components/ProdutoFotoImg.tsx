import { useEffect, useState } from "react";
import { getProdutoFotoUrl, isFullUrl } from "@/lib/produto-foto";
import { Image as ImageIcon, Loader2 } from "lucide-react";

type Props = {
  stored: string | null | undefined;
  alt?: string;
  className?: string;
  fallbackIconClassName?: string;
  showLoadingSpinner?: boolean;
  onClick?: () => void;
};

export function ProdutoFotoImg({
  stored,
  alt = "Foto do produto",
  className = "w-full h-full object-cover",
  fallbackIconClassName = "size-5 text-muted-foreground/60",
  showLoadingSpinner = false,
  onClick,
}: Props) {
  const [src, setSrc] = useState<string | null>(() => (isFullUrl(stored) ? stored! : null));
  const [loading, setLoading] = useState<boolean>(!isFullUrl(stored) && Boolean(stored));
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);

    if (!stored) {
      setSrc(null);
      setLoading(false);
      return;
    }

    if (isFullUrl(stored)) {
      setSrc(stored);
      setLoading(false);
      return;
    }

    setLoading(true);
    getProdutoFotoUrl(stored)
      .then((url) => {
        if (!cancelled) {
          if (url) {
            setSrc(url);
          } else {
            setError(true);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [stored]);

  if (loading && showLoadingSpinner) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-muted/30">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!src || error) {
    return (
      <div
        className="flex items-center justify-center w-full h-full bg-muted/40 text-muted-foreground"
        onClick={onClick}
      >
        <ImageIcon className={fallbackIconClassName} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
      onClick={onClick}
    />
  );
}
