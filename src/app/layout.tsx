import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TKAP - Accounts Payable",
  description: "TKAP Accounts Payable Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}