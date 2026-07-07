import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

const HOME_PAGES: Record<string, string> = {
  messages: '/messages',
  profile: '/profile',
  contacts: '/friends',
  favorites: '/messages?favorites=1',
  settings: '/settings',
}

export default async function RootPage() {
  const store = await cookies()
  const home = store.get('qvor_home')?.value ?? 'messages'
  redirect(HOME_PAGES[home] ?? '/messages')
}
