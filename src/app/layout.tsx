import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Invitee — AI Event Management Platform",
  description:
    "Your complete event management intelligence platform. Manage every event — from invitations to check-in — with Invitee.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://invitee.co.tz"),
  openGraph: {
    title: "Invitee — AI Event Management Platform",
    description: "Manage every event, with intelligence.",
    siteName: "Invitee",
    locale: "en_TZ",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${font.variable} font-sans`} suppressHydrationWarning>
      <body>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
