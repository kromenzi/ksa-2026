import type { SyntheticEvent } from "react";
import { cn } from "@/lib/utils";

interface BrandLogo3DProps {
  src: string;
  alt: string;
  className?: string;
  size?: "hero" | "login";
}

export function BrandLogo3D({ src, alt, className, size = "hero" }: BrandLogo3DProps) {
  const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.src !== `${window.location.origin}/utec-logo.svg`) {
      event.currentTarget.src = "/utec-logo.svg";
    }
  };

  return (
    <div className={cn("brand-logo-3d", `brand-logo-3d--${size}`, className)} aria-label={alt} role="img">
      <div className="brand-logo-3d__halo" aria-hidden="true" />
      <div className="brand-logo-3d__shadow" aria-hidden="true" />
      <div className="brand-logo-3d__stage">
        <div className="brand-logo-3d__depth brand-logo-3d__depth--back" aria-hidden="true">
          <img src={src} alt="" onError={handleImageError} />
        </div>
        <div className="brand-logo-3d__depth brand-logo-3d__depth--mid" aria-hidden="true">
          <img src={src} alt="" onError={handleImageError} />
        </div>
        <div className="brand-logo-3d__face">
          <img src={src} alt="" onError={handleImageError} />
          <span className="brand-logo-3d__shine" aria-hidden="true" />
        </div>
      </div>
      <div className="brand-logo-3d__orbit brand-logo-3d__orbit--one" aria-hidden="true" />
      <div className="brand-logo-3d__orbit brand-logo-3d__orbit--two" aria-hidden="true" />
    </div>
  );
}
