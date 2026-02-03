import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/views/[id]/items - Add a work item row
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: viewId } = await params
    const body = await request.json()
    const { values } = body

    // Verify view exists
    const view = await prisma.view.findUnique({ where: { id: viewId } })
    if (!view) {
      return NextResponse.json({ error: 'View not found' }, { status: 404 })
    }

    // Get the highest order value
    const lastItem = await prisma.workItem.findFirst({
      where: { viewId },
      orderBy: { order: 'desc' },
    })
    const nextOrder = (lastItem?.order ?? -1) + 1

    const item = await prisma.workItem.create({
      data: {
        viewId,
        values: values ? JSON.stringify(values) : '{}',
        order: nextOrder,
      },
    })

    return NextResponse.json({
      ...item,
      values: JSON.parse(item.values),
    })
  } catch (error) {
    console.error('Error creating work item:', error)
    return NextResponse.json({ error: 'Failed to create work item' }, { status: 500 })
  }
}
