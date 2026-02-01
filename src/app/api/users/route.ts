import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/users - Get all users
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { statusUpdates: true },
        },
      },
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, role } = body

    if (!email || !name) {
      return NextResponse.json({ error: 'email and name are required' }, { status: 400 })
    }

    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: role || 'DEVELOPER',
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
