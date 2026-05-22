import type { Metadata } from "next";
import { Space_Mono, Syne } from "next/font/google";
import "./globals.css";
import { Topbar } from "@/components/shell/Topbar";
import { Sidebar } from "@/components/shell/Sidebar";
import { StreamProvider } from "@/components/stream/StreamProvider";
import { ToastContainer } from "@/components/stream/ToastContainer";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["400", "500", "600", "700", "800"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "9CJ Corp — Personal AI Operating System",
  description: "Personal AI Operating System for trading, ops, and life.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${syne.variable} ${spaceMono.variable} bg-bg-base text-ink antialiased min-h-screen`}
      >
        <StreamProvider>
          <div className="flex flex-col min-h-screen">
            <Topbar />
            <div className="flex flex-1 min-h-0">
              <Sidebar />
              <main className="flex-1 min-w-0 overflow-y-auto p-6">
                {children}
              </main>
            </div>
          </div>
          <ToastContainer />
        </StreamProvider>
      </body>
    </html>
  );
}
