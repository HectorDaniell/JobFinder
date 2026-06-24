import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'JobFinder',
  description: 'Personal high-signal job search copilot',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
