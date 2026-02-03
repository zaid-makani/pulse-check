import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { SYSTEM_COLUMNS } from '@/lib/view-columns'

// GET /api/views - List all views
export async function GET() {
  try {
    const views = await prisma.view.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            items: true,
            columns: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(views)
  } catch (error) {
    console.error('Error fetching views:', error)
    return NextResponse.json({ error: 'Failed to fetch views' }, { status: 500 })
  }
}

// POST /api/views - Create a new view with system columns
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, createdById } = body

    if (!name || !createdById) {
      return NextResponse.json({ error: 'name and createdById are required' }, { status: 400 })
    }

    // Create view with system columns in a transaction
    const view = await prisma.$transaction(async (tx) => {
      const newView = await tx.view.create({
        data: {
          name,
          description,
          createdById,
        },
      })

      // Create system columns
      await tx.viewColumn.createMany({
        data: SYSTEM_COLUMNS.map((col) => ({
          viewId: newView.id,
          name: col.name,
          type: col.type,
          options: 'options' in col ? JSON.stringify(col.options) : '[]',
          isSystem: true,
          order: col.order,
        })),
      })

      return newView
    })

    // Fetch the complete view with columns
    const completeView = await prisma.view.findUnique({
      where: { id: view.id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        columns: {
          orderBy: { order: 'asc' },
        },
        items: {
          orderBy: { order: 'asc' },
        },
      },
    })

    return NextResponse.json(completeView)
  } catch (error) {
    console.error('Error creating view:', error)
    return NextResponse.json({ error: 'Failed to create view' }, { status: 500 })
  }
}
