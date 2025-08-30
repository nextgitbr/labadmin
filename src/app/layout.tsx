import { Outfit, Inter, Roboto, Playfair_Display, Merriweather } from 'next/font/google';
import './globals.css';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';

const outfit = Outfit({ subsets: ["latin"], variable: '--font-sans-outfit' });
const inter = Inter({ subsets: ["latin"], variable: '--font-sans-inter' });
const roboto = Roboto({ subsets: ["latin"], weight: ['400','500','700'], variable: '--font-sans-roboto' });
const playfair = Playfair_Display({ subsets: ["latin"], variable: '--font-serif-playfair' });
const merriweather = Merriweather({ subsets: ["latin"], weight: ['400','700'], variable: '--font-serif-merriweather' });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${inter.variable} ${roboto.variable} ${playfair.variable} ${merriweather.variable}`}>
      <body className={`dark:bg-gray-900`}>
        <ThemeProvider>
          <SidebarProvider>{children}</SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
