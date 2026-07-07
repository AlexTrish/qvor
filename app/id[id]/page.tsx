import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PublicProfile } from '@/components/PublicProfile'

export default async function NumericIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const numericId = parseInt(id, 10)

  if (!isNaN(numericId)) {
    const user = await prisma.user.findUnique({
      where: { numericId },
      select: { username: true },
    })
    if (user?.username) {
      redirect(`/@${user.username}`)
    }
  }

  return <PublicProfile lookup={id} />
}
