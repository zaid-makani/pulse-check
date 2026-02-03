import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/views/[id] - Get a single view with columns and items
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const view = await prisma.view.findUnique({
      where: { id },
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

    if (!view) {
      return NextResponse.json({ error: 'View not found' }, { status: 404 })
    }

    // Parse JSON fields
    const parsedView = {
      ...view,
      columns: view.columns.map((col) => ({
        ...col,
        options: JSON.parse(col.options),
      })),
      items: view.items.map((item) => ({
        ...item,
        values: JSON.parse(item.values),
      })),
    }

    return NextResponse.json(parsedView)
  } catch (error) {
    console.error('Error fetching view:', error)
    return NextResponse.json({ error: 'Failed to fetch view' }, { status: 500 })
  }
}

// PATCH /api/views/[id] - Update view name/description
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { name, description } = body

    const existing = await prisma.view.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'View not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description

    const updated = await prisma.view.update({
      where: { id },
      data: updateData,
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

    // Parse JSON fields
    const parsedView = {
      ...updated,
      columns: updated.columns.map((col) => ({
        ...col,
        options: JSON.parse(col.options),
      })),
      items: updated.items.map((item) => ({
        ...item,
        values: JSON.parse(item.values),
      })),
    }

    return NextResponse.json(parsedView)
  } catch (error) {
    console.error('Error updating view:', error)
    return NextResponse.json({ error: 'Failed to update view' }, { status: 500 })
  }
}

// DELETE /api/views/[id] - Delete a view (cascades to columns and items)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const existing = await prisma.view.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'View not found' }, { status: 404 })
    }

    await prisma.view.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'View deleted' })
  } catch (error) {
    console.error('Error deleting view:', error)
    return NextResponse.json({ error: 'Failed to delete view' }, { status: 500 })
  }
}
