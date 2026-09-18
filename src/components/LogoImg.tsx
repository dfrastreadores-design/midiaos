import { useEffect, useState } from "react";
import { getLogoSignedUrl } from "@/lib/logo-url";

type Props = {
  stored: string | null | undefined;
  alt?: string;
  className?: string;
};

export function LogoImg({ stored, alt = "Logo", className }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    if (!stored) return;
    getLogoSignedUrl(stored).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [stored]);

  if (!src) return null;
  return <img src={src} alt={alt} className={className} />;
}
