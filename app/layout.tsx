import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Presenter",
  description: "Intditronics Presenter that presents videos and logos",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
