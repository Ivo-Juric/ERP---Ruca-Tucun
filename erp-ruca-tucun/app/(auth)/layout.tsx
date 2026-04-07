import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceso — ERP Ruca Tucún",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-ruca-black antialiased">{children}</body>
    </html>
  );
}
