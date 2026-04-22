<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
import { DM_Sans, Syne } from "next/font/google";
import "./globals.css";
import ClientProviders from "@/components/ClientProviders";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  title: "BlinkChat",
  description: "Next-gen real-time messaging",
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} ${syne.variable} grain`}>
        {/* Aurora ambient background */}
        <div className="aurora-bg" aria-hidden="true">
          <div className="aurora-orb" />
        </div>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
