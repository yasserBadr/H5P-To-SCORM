import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "H5P → SCORM" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Browser extensions and legacy UI runtimes may mutate the two document
  // roots before React hydrates (for example `mdl-js` on <html> and
  // `cz-shortcut-listen` on <body>). Suppress only those root-level diffs.
  return <html lang="ar" dir="rtl" suppressHydrationWarning>
    <body suppressHydrationWarning>{children}</body>
  </html>;
}
