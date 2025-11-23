
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'Classroom Connector',
  description: 'An educational chatroom for teachers and students.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="w-full min-h-screen" >
      <Providers>
            {children}
            <Toaster />
        </Providers>
      </body>
    </html>
  );
}
