import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fullName, email, phone, password } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json({ error: 'El nombre completo es requerido' }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return NextResponse.json({ error: 'El correo electrónico es requerido' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = (phone || '').trim();
    const cleanFullName = fullName.trim();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    let userId: string | null = null;

    if (serviceRoleKey) {
      // 1. If service role key is present, use admin auth API (auto-confirms email)
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const { data: adminUser, error: adminErr } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanFullName,
          phone: cleanPhone,
          role: 'technician',
        },
      });

      if (adminErr) {
        return NextResponse.json({ error: adminErr.message }, { status: 400 });
      }

      userId = adminUser.user?.id || null;

      // Upsert profile directly
      if (userId) {
        await adminClient.from('profiles').upsert({
          id: userId,
          email: cleanEmail,
          full_name: cleanFullName,
          phone: cleanPhone,
          role: 'technician',
          updated_at: new Date().toISOString(),
        });
      }
    } else {
      // 2. Otherwise use unpersisted anon client signUp
      const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      });

      const { data: signUpData, error: signUpErr } = await anonClient.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanFullName,
            phone: cleanPhone,
            role: 'technician',
          },
        },
      });

      if (signUpErr) {
        return NextResponse.json({ error: signUpErr.message }, { status: 400 });
      }

      userId = signUpData.user?.id || null;

      if (userId) {
        await anonClient.from('profiles').upsert({
          id: userId,
          email: cleanEmail,
          full_name: cleanFullName,
          phone: cleanPhone,
          role: 'technician',
          updated_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: cleanEmail,
        full_name: cleanFullName,
        phone: cleanPhone,
        role: 'technician',
      },
    });
  } catch (err: any) {
    console.error('Error in POST /api/admin/technicians:', err);
    return NextResponse.json({ error: err.message || 'Error al crear técnico' }, { status: 500 });
  }
}
