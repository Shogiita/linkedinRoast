import type { Metadata } from "next";
import { Permanent_Marker, Roboto } from 'next/font/google';
import "./globals.css";
import React from "react";

const permanentMarker = Permanent_Marker({ 
  weight: '400', 
  subsets: ['latin'],
  variable: '--font-marker', 
});

const roboto = Roboto({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-roboto',
});

export const metadata: Metadata = {
  title: "Esther Setiawan - Roasted Profile",
  description: "A satirical profile page",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${roboto.variable} ${permanentMarker.variable} antialiased`}>
      <head>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}