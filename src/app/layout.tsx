import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Headshot Generator",
  description: "AI-powered professional headshots",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <div id="root-layout">{children}</div>
      </body>
    </html>
  );
}
