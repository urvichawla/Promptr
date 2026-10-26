import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Promptr",
  description: "Quick access to your saved AI prompts",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full text-neutral-900 dark:text-neutral-100">{children}</body>
    </html>
  );
}
