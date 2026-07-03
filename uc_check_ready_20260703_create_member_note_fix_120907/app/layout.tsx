import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UC Check",
  description: "Urban Conditioning attendance and membership check-in"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
