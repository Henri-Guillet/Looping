import "./globals.css";
import RainbowKitAndWagmiProvider from "./RainbowKitAndWagmiProvider";
import Layout from "@/components/shared/Layout";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { Inter as FontSans } from "next/font/google"
import { cn } from "@/lib/utils"

export const metadata = {
  title: "Looping",
  description: "Looping is a platform for creating leverage positions on Morpho protocol",
};

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body suppressHydrationWarning={true}
        className={cn(
          " font-sans antialiased",
          fontSans.variable
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <RainbowKitAndWagmiProvider>
          <Layout>
            {children}
          </Layout>
        </RainbowKitAndWagmiProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
