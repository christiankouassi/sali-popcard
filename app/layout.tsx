import "./globals.css";
import "./redesign.css";
import PopCardApp from "@/components/App";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "PopCard · SALI DigiCom",
  description:
    "Votre carte de visite connectée et votre mini-site professionnel.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <PopCardApp />
        {children}
      </body>
    </html>
  );
}
