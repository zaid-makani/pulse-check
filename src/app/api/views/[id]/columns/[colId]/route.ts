import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH /api/views/[id]/columns/[colId] - Update a column
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; colId: string }> }
) {
  try {
    const { id: viewId, colId } = await params
    const body = await request.json()
    const { name, type, options, order } = body

    const existing = await prisma.viewColumn.findFirst({
      where: { id: colId, viewId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (type !== undefined) updateData.type = type
    if (options !== undefined) updateData.options = JSON.stringify(options)
    if (order !== undefined) updateData.order = order

    const updated = await prisma.viewColumn.update({
      where: { id: colId },
      data: updateData,
    })

    return NextResponse.json({
      ...updated,
      options: JSON.parse(updated.options),
    })
  } catch (error) {
    console.error('Error updating column:', error)
    return NextResponse.json({ error: 'Failed to update column' }, { status: 500 })
  }
}

// DELETE /api/views/[id]/columns/[colId] - Delete a custom column
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; colId: string }> }
) {
  try {
    const { id: viewId, colId } = await params

    const existing = await prisma.viewColumn.findFirst({
      where: { id: colId, viewId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Column not found' }, { status: 404 })
    }

    await prisma.viewColumn.delete({ where: { id: colId } })

    return NextResponse.json({ success: true, message: 'Column deleted' })
  } catch (error) {
    console.error('Error deleting column:', error)
    return NextResponse.json({ error: 'Failed to delete column' }, { status: 500 })
  }
}
