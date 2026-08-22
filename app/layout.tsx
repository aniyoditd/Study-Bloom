import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./application.css";
import "./study-v2.css";
import "./study-v3.css";
import "./study-v3-progress.css";
import "./study-personal.css";
import "katex/dist/katex.min.css";
import PwaRegister from "./study/PwaRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudyBloom — Your personal study space",
  description: "A private mini online school for classes, homework, study guides, exams, math notes, whiteboarding, and progress.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/studybloom-icon.png",
    shortcut: "/studybloom-icon.png",
    apple: "/studybloom-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
