import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Header } from '../components/Header';
import { ProfileProvider } from '../components/ProfileProvider';
import './globals.css';

// next/font: descarga y auto-hospeda las fuentes en build (sin CDN, sin
// parpadeo). Las expone como variables CSS que Tailwind usa (font-sans/font-mono).
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' });

export const metadata: Metadata = {
  title: 'JobFinder',
  description: 'Personal high-signal job search copilot',
};

// Corre ANTES de pintar: fija el tema desde localStorage (o la preferencia del
// sistema) para que no haya "flash" de tema equivocado (FOUC).
const themeScript = `
(function () {
  try {
    var t = localStorage.getItem('theme');
    var dark = t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // suppressHydrationWarning: el script de arriba modifica la clase de <html>
  // antes de que React hidrate; sin esto, React avisaría de un desajuste.
  return (
    <html
      lang="es"
      className={`${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">
        {/* La "antena" del Context: todo lo de adentro puede sintonizar useProfile().
            layout.tsx sigue siendo Server Component: envolver con un Client
            Component NO convierte a los children — viajan como "slots" ya resueltos. */}
        <ProfileProvider>
          <Header />
          {children}
        </ProfileProvider>
      </body>
    </html>
  );
}
