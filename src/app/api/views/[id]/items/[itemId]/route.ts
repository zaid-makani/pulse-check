import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH /api/views/[id]/items/[itemId] - Update work item values
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: viewId, itemId } = await params
    const body = await request.json()
    const { values, order } = body

    const existing = await prisma.workItem.findFirst({
      where: { id: itemId, viewId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Work item not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (values !== undefined) updateData.values = JSON.stringify(values)
    if (order !== undefined) updateData.order = order

    const updated = await prisma.workItem.update({
      where: { id: itemId },
      data: updateData,
    })

    return NextResponse.json({
      ...updated,
      values: JSON.parse(updated.values),
    })
  } catch (error) {
    console.error('Error updating work item:', error)
    return NextResponse.json({ error: 'Failed to update work item' }, { status: 500 })
  }
}

// DELETE /api/views/[id]/items/[itemId] - Delete a work item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { id: viewId, itemId } = await params

    const existing = await prisma.workItem.findFirst({
      where: { id: itemId, viewId },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Work item not found' }, { status: 404 })
    }

    await prisma.workItem.delete({ where: { id: itemId } })

    return NextResponse.json({ success: true, message: 'Work item deleted' })
  } catch (error) {
    console.error('Error deleting work item:', error)
    return NextResponse.json({ error: 'Failed to delete work item' }, { status: 500 })
  }
}
