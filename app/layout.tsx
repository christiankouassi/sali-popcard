import "./globals.css";
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
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
