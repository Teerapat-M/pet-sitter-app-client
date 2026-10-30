import { Nunito } from "next/font/google";
import "./globals.css";
import AppProviders from "@/components/AppProviders";
import Toaster from "@/components/Toaster";

const nunito = Nunito({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-nunito",
});

export const metadata = {
  title: "Pet Sitter Plus",
  description: "Trusted care for your pet, with eyes on every moment.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`h-full antialiased ${nunito.variable}`}>
      <body className={`${nunito.className} flex min-h-full flex-col bg-background font-sans text-foreground`}>
        <AppProviders>
          <main className="min-w-0 flex-1 overflow-x-clip">{children}</main>
        </AppProviders>
        <Toaster />
      </body>
    </html>
  );
}
