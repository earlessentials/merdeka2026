import type { Metadata } from "next";
import { headers } from "next/headers";
import "./merdeka.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const socialImage = `${protocol}://${host}/og.png`;

  return {
    title: "Gifts for Independence Day by Pearling",
    description: "A tiny 17 Agustus digital game with gifts, a Merdeka Lucky Wheel, riddles, and guaranteed Pearling treats.",
    openGraph: {
      title: "Gifts for Independence Day by Pearling",
      description: "Free stuff, a lucky wheel, two riddles, and tiny Merdeka chaos.",
      type: "website",
      images: [{ url: socialImage, width: 1536, height: 1024, alt: "Gifts for Independence Day by Pearling" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Gifts for Independence Day by Pearling",
      description: "Free stuff, a lucky wheel, two riddles, and tiny Merdeka chaos.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
