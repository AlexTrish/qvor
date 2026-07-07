import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Восстановление доступа — QVOR',
  description: 'Восстановите доступ к аккаунту QVOR через кодовую фразу.',
  alternates: { canonical: 'https://qvor.ru/recover' },
  robots: { index: false, follow: false },
}

export default function RecoverLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
