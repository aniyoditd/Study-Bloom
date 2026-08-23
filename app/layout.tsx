import type { Metadata } from "next";
import "./globals.css";
import "./application.css";
import "./study-v2.css";
import "./study-v3.css";
import "./study-v3-progress.css";
import "./study-personal.css";
import "./study-v4.css";
import "./study-v5.css";
import "./study-v6.css";
import "./study-v7.css";
import "katex/dist/katex.min.css";
import PwaRegister from "./study/PwaRegister";

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
      <body>
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
