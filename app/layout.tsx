import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LLM Arena: Inter-LLM Interaction Observer',
  description: 'Advanced platform for observing and analyzing interactions between Large Language Models. Features unlimited turn conversations, real-time streaming, sentiment analysis, professional PDF reports, and comprehensive safety mechanisms.',
  keywords: [
    'LLM Arena',
    'Large Language Models',
    'AI Interaction',
    'Model Comparison',
    'Sentiment Analysis',
    'AI Evaluation',
    'Machine Learning',
    'Natural Language Processing',
    'AI Research',
    'Model Benchmarking',
    'Mechanistic Interpretability',
    'Mech Interp',
    'Agent Benchmark'
  ],
  authors: [{ name: 'LLM Arena Team' }],
  creator: 'LLM Arena Platform',
  publisher: 'LLM Arena',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://llmarena.io'),
  openGraph: {
    title: 'LLM Arena: Inter-LLM Interaction Observer',
    description: 'Advanced platform for observing and analyzing interactions between Large Language Models with real-time streaming and professional reporting.',
    type: 'website',
    locale: 'en_US',
    siteName: 'LLM Arena',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LLM Arena: Inter-LLM Interaction Observer',
    description: 'Advanced platform for observing and analyzing interactions between Large Language Models.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
