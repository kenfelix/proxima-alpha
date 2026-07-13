import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Navigation } from "@/components/Navigation";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Proxima - Disconnect to Connect",
  description: "Plan hangouts and reconnect in person.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} font-sans antialiased bg-black text-neutral-50 pb-20 selection:bg-neutral-800`}>
        <AuthProvider>
          {children}
          <Navigation />
        </AuthProvider>
      </body>
    </html>
  );
}

