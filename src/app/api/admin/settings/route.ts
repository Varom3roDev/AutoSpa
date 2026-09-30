import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SETTINGS_FILE = path.join(process.cwd(), '.app_settings.json');

const DEFAULT_SETTINGS = {
  id: 'default',
  bcv_exchange_rate: 36.5,
  home_banner_title: 'Lavado ecológico y premium',
  home_banner_text: 'Ahorramos hasta 200L de agua por servicio en Caracas',
  support_whatsapp: '+58 416 6315114',
  updated_at: new Date().toISOString(),
};

function readLocalSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      return { ...DEFAULT_SETTINGS, ...JSON.parse(content) };
    }
  } catch (err) {
    console.warn('Could not read .app_settings.json:', err);
  }
  return DEFAULT_SETTINGS;
}

function writeLocalSettings(data: any) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write .app_settings.json:', err);
  }
}

export async function GET() {
  try {
    // 1. Try Supabase if table exists
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const client = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await client.from('app_settings').select('*').eq('id', 'default').single();
        if (!error && data) {
          writeLocalSettings(data);
          return NextResponse.json(data);
        }
      } catch {}
    }

    // 2. Fallback to server local file (synced for all devices in local network)
    const settings = readLocalSettings();
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json(DEFAULT_SETTINGS);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const current = readLocalSettings();

    const merged = {
      ...current,
      ...body,
      bcv_exchange_rate: typeof body.bcv_exchange_rate === 'number' 
        ? body.bcv_exchange_rate 
        : parseFloat(String(body.bcv_exchange_rate).replace(',', '.')) || current.bcv_exchange_rate,
      updated_at: new Date().toISOString(),
    };

    // 1. Save in server local storage for multi-device sync across LAN
    writeLocalSettings(merged);

    // 2. Try Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      try {
        const client = createClient(supabaseUrl, supabaseKey);
        await client.from('app_settings').upsert({
          id: 'default',
          bcv_exchange_rate: merged.bcv_exchange_rate,
          home_banner_title: merged.home_banner_title,
          home_banner_text: merged.home_banner_text,
          support_whatsapp: merged.support_whatsapp,
          updated_at: merged.updated_at,
        });
      } catch {}
    }

    return NextResponse.json({ success: true, settings: merged });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Error guardando configuración' }, { status: 500 });
  }
}
