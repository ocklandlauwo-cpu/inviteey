import Image from "next/image";
import { cn } from "@/lib/utils";

/* White filter for use on dark / hero backgrounds */
const WHITE_FILTER = "brightness(0) invert(1)";

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
      src="/logo.png"
      alt="inviteey.com"
      width={h * 3}
      height={h}
      priority
      className={cn("object-contain select-none", className)}
      style={{
        height: h,
        width:  "auto",
        filter: white ? WHITE_FILTER : undefined,
      }}
    />
  );
}
