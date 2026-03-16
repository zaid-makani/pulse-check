import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { suggestWorkItems, UpdateSummary } from '@/lib/ai'

// POST /api/views/[id]/suggest - Get AI suggestions from recent updates
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: viewId } = await params
    const body = await request.json()
    const days = body.days || 7

    // Verify view exists
    const view = await prisma.view.findUnique({ where: { id: viewId } })
    if (!view) {
      return NextResponse.json({ error: 'View not found' }, { status: 404 })
    }

    // Get recent status updates scoped to view's team
    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - days)

    const updates = await prisma.statusUpdate.findMany({
      where: {
        createdAt: { gte: dateFilter },
        ...(view.teamId ? { teamId: view.teamId } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (updates.length === 0) {
      return NextResponse.json({ suggestions: [] })
    }

    // Format updates for AI
    const formattedUpdates: UpdateSummary[] = updates.map((update) => ({
      id: update.id,
      userId: update.userId,
      userName: update.user.name,
      completed: JSON.parse(update.completed),
      inProgress: JSON.parse(update.inProgress),
      blockers: JSON.parse(update.blockers),
      summary: update.summary,
    }))

    // Get AI suggestions
    const suggestions = await suggestWorkItems(formattedUpdates)

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Error generating suggestions:', error)
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 })
  }
}
