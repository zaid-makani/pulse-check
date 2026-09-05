import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TeamRole } from '@prisma/client'

// Helper to check if user can manage members
async function canManageMembers(userId: string, teamId: string) {
  const membership = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId, teamId } },
  })
  return membership?.role === 'LEAD' || membership?.role === 'MANAGER'
}

// PATCH /api/teams/[id]/members/[userId] - Update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId, userId } = await params

    // Check permissions
    if (!(await canManageMembers(session.user.id, teamId))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { role } = body

    // Validate role
    if (!['MEMBER', 'LEAD', 'MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Can't change your own role
    if (userId === session.user.id) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 })
    }

    // Check if membership exists
    const membership = await prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId, teamId } },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Update role
    const updated = await prisma.teamMembership.update({
      where: { userId_teamId: { userId, teamId } },
      data: { role: role as TeamRole },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating member:', error)
    return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
  }
}

// DELETE /api/teams/[id]/members/[userId] - Remove member from team
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId, userId } = await params

    // Users can remove themselves, or managers can remove others
    const isSelf = userId === session.user.id
    const canManage = await canManageMembers(session.user.id, teamId)

    if (!isSelf && !canManage) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Check if membership exists
    const membership = await prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId, teamId } },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent removing the last LEAD
    if (membership.role === 'LEAD') {
      const leadCount = await prisma.teamMembership.count({
        where: { teamId, role: 'LEAD' },
      })

      if (leadCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last team lead. Promote another member first.' },
          { status: 400 }
        )
      }
    }

    // Remove member
    await prisma.teamMembership.delete({
      where: { userId_teamId: { userId, teamId } },
    })

    return NextResponse.json({ message: 'Member removed' })
  } catch (error) {
    console.error('Error removing member:', error)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}
