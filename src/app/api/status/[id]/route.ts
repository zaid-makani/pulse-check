import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { extractStatusFromTranscript } from '@/lib/ai'

// GET /api/status/[id] - Get a single status update
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const update = await prisma.statusUpdate.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    if (!update) {
      return NextResponse.json({ error: 'Status update not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...update,
      completed: JSON.parse(update.completed),
      inProgress: JSON.parse(update.inProgress),
      blockers: JSON.parse(update.blockers),
      needsHelp: JSON.parse(update.needsHelp),
      riskFlags: JSON.parse(update.riskFlags),
    })
  } catch (error) {
    console.error('Error fetching status update:', error)
    return NextResponse.json({ error: 'Failed to fetch status update' }, { status: 500 })
  }
}

// PATCH /api/status/[id] - Update a status update
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { rawTranscript, summary, completed, inProgress, blockers, needsHelp, regenerate } = body

    // Check if update exists
    const existing = await prisma.statusUpdate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Status update not found' }, { status: 404 })
    }

    let updateData: Record<string, unknown> = {}

    // If regenerate flag is set, re-run AI extraction on the transcript
    if (regenerate && rawTranscript) {
      const extracted = await extractStatusFromTranscript(rawTranscript)
      updateData = {
        rawTranscript,
        completed: JSON.stringify(extracted.completed),
        inProgress: JSON.stringify(extracted.inProgress),
        blockers: JSON.stringify(extracted.blockers),
        needsHelp: JSON.stringify(extracted.needsHelp),
        sentiment: extracted.sentiment,
        riskFlags: JSON.stringify(extracted.riskFlags),
        summary: extracted.summary,
      }
    } else {
      // Manual update without AI regeneration
      if (rawTranscript !== undefined) updateData.rawTranscript = rawTranscript
      if (summary !== undefined) updateData.summary = summary
      if (completed !== undefined) updateData.completed = JSON.stringify(completed)
      if (inProgress !== undefined) updateData.inProgress = JSON.stringify(inProgress)
      if (blockers !== undefined) updateData.blockers = JSON.stringify(blockers)
      if (needsHelp !== undefined) updateData.needsHelp = JSON.stringify(needsHelp)
    }

    const updated = await prisma.statusUpdate.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json({
      ...updated,
      completed: JSON.parse(updated.completed),
      inProgress: JSON.parse(updated.inProgress),
      blockers: JSON.parse(updated.blockers),
      needsHelp: JSON.parse(updated.needsHelp),
      riskFlags: JSON.parse(updated.riskFlags),
    })
  } catch (error) {
    console.error('Error updating status:', error)
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
  }
}

// DELETE /api/status/[id] - Delete a status update
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check if update exists
    const existing = await prisma.statusUpdate.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Status update not found' }, { status: 404 })
    }

    await prisma.statusUpdate.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'Status update deleted' })
  } catch (error) {
    console.error('Error deleting status:', error)
    return NextResponse.json({ error: 'Failed to delete status' }, { status: 500 })
  }
}
