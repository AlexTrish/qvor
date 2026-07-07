'use client'

import { use } from 'react'
import { PublicProfile } from '@/components/PublicProfile'

export default function UsernamePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params)
  // Передаём с @ чтобы API понял что это username
  return <PublicProfile lookup={`@${username}`} />
}
