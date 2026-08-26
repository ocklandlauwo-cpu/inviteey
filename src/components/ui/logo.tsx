import Image from "next/image";
import { cn } from "@/lib/utils";

/* CSS filter that shifts the logo's green palette → amber (#D97706)
   sepia(1)        — converts all hues to warm ~35° sepia
   hue-rotate(5deg)— fine-tune to hit amber hue
   saturate(3)     — boost saturation to match amber-600 vividness
   brightness(0.9) — darken slightly to amber-700 depth              */
const AMBER_FILTER = "sepia(1) hue-rotate(5deg) saturate(3) brightness(0.9)";

/* White filter for use on dark / hero backgrounds */
const WHITE_FILTER  = "brightness(0) invert(1)";

const HEIGHTS: Record<string, number> = { xs: 28, sm: 40, md: 64, lg: 96 };

interface LogoProps {
  /** Controls rendered height; width scales proportionally */
  size?: "xs" | "sm" | "md" | "lg";
  /** Use on dark/hero backgrounds — renders the logo in white */
  white?: boolean;
  className?: string;
}

export function Logo({ size = "sm", white = false, className }: LogoProps) {
  const h = HEIGHTS[size] ?? 40;
  return (
    <Image
      src="/logo.jpg"
      alt="Invitee"
      width={h}
      height={h}
      priority
      className={cn("object-contain select-none", className)}
      style={{
        height: h,
        width:  "auto",
        filter: white ? WHITE_FILTER : AMBER_FILTER,
      }}
    />
  );
}
