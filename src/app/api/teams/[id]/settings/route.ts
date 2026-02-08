import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// Helper to check if user can manage settings
async function canManageSettings(userId: string, teamId: string) {
  const membership = await prisma.teamMembership.findUnique({
    where: { userId_teamId: { userId, teamId } },
  })
  return membership?.role === 'LEAD' || membership?.role === 'MANAGER'
}

// GET /api/teams/[id]/settings - Get team settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if user is a member of this team
    const membership = await prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId: session.user.id, teamId: id } },
    })

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 })
    }

    // Get or create settings
    let settings = await prisma.teamSettings.findUnique({
      where: { teamId: id },
    })

    if (!settings) {
      // Create default settings if they don't exist
      settings = await prisma.teamSettings.create({
        data: { teamId: id },
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching team settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// PATCH /api/teams/[id]/settings - Update team settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check permissions
    if (!(await canManageSettings(session.user.id, id))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const {
      reminderTime,
      reminderDays,
      digestEnabled,
      digestSchedule,
      digestTime,
      timezone,
      slackWebhookUrl,
    } = body

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
    if (reminderTime && !timeRegex.test(reminderTime)) {
      return NextResponse.json({ error: 'Invalid reminder time format' }, { status: 400 })
    }
    if (digestTime && !timeRegex.test(digestTime)) {
      return NextResponse.json({ error: 'Invalid digest time format' }, { status: 400 })
    }

    // Validate digest schedule
    if (digestSchedule && !['daily', 'weekly'].includes(digestSchedule)) {
      return NextResponse.json({ error: 'Invalid digest schedule' }, { status: 400 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (reminderTime !== undefined) updateData.reminderTime = reminderTime
    if (reminderDays !== undefined) updateData.reminderDays = JSON.stringify(reminderDays)
    if (digestEnabled !== undefined) updateData.digestEnabled = digestEnabled
    if (digestSchedule !== undefined) updateData.digestSchedule = digestSchedule
    if (digestTime !== undefined) updateData.digestTime = digestTime
    if (timezone !== undefined) updateData.timezone = timezone
    if (slackWebhookUrl !== undefined) updateData.slackWebhookUrl = slackWebhookUrl || null

    // Upsert settings
    const settings = await prisma.teamSettings.upsert({
      where: { teamId: id },
      update: updateData,
      create: {
        teamId: id,
        ...updateData,
      },
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error updating team settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
