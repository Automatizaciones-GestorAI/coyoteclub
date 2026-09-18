import { NextRequest, NextResponse } from 'next/server';
import { createAdminSession, clearAdminSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }
  await createAdminSession();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  clearAdminSession();
  return NextResponse.json({ ok: true });
}
