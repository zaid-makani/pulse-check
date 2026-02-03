import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// POST /api/views/[id]/columns - Add a custom column
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: viewId } = await params
    const body = await request.json()
    const { name, type, options } = body

    if (!name || !type) {
      return NextResponse.json({ error: 'name and type are required' }, { status: 400 })
    }

    // Verify view exists
    const view = await prisma.view.findUnique({ where: { id: viewId } })
    if (!view) {
      return NextResponse.json({ error: 'View not found' }, { status: 404 })
    }

    // Get the highest order value
    const lastColumn = await prisma.viewColumn.findFirst({
      where: { viewId },
      orderBy: { order: 'desc' },
    })
    const nextOrder = (lastColumn?.order ?? -1) + 1

    const column = await prisma.viewColumn.create({
      data: {
        viewId,
        name,
        type,
        options: options ? JSON.stringify(options) : '[]',
        isSystem: false,
        order: nextOrder,
      },
    })

    return NextResponse.json({
      ...column,
      options: JSON.parse(column.options),
    })
  } catch (error) {
    console.error('Error creating column:', error)
    return NextResponse.json({ error: 'Failed to create column' }, { status: 500 })
  }
}
