import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stripe Preorder App",
  description: "Stripe Payment Element Demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`antialiased bg-gray-50 text-black`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
