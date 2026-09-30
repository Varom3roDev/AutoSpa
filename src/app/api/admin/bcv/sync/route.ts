import { NextResponse } from 'next/server';
import { fetchLatestBcvRate } from '@/lib/bcv';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SETTINGS_FILE = path.join(process.cwd(), '.app_settings.json');

function saveSettingsLocally(rate: number, fechaValor: string) {
  try {
    let settings: any = {};
    if (fs.existsSync(SETTINGS_FILE)) {
      settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
    settings.bcv_exchange_rate = rate;
    settings.bcv_last_synced_at = new Date().toISOString();
    settings.bcv_fecha_valor = fechaValor;
    settings.bcv_rate_mode = settings.bcv_rate_mode || 'auto_b';
    settings.updated_at = new Date().toISOString();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    return settings;
  } catch (e) {
    console.warn('Could not save synced BCV rate locally:', e);
    return null;
  }
}

async function saveSettingsSupabase(rate: number, fechaValor: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      const client = createClient(supabaseUrl, supabaseKey);
      await client.from('app_settings').upsert({
        id: 'default',
        bcv_exchange_rate: rate,
        bcv_last_synced_at: new Date().toISOString(),
        bcv_fecha_valor: fechaValor,
        bcv_rate_mode: 'auto_b',
        updated_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn('Could not save synced BCV rate to Supabase:', e);
  }
}

export async function GET() {
  try {
    const result = await fetchLatestBcvRate();
    if (!result.success || !result.rate) {
      return NextResponse.json({ error: result.error || 'No se pudo sincronizar' }, { status: 502 });
    }

    // Persistir automáticamente
    saveSettingsLocally(result.rate, result.fecha_valor || '');
    await saveSettingsSupabase(result.rate, result.fecha_valor || '');

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al sincronizar tasa BCV' }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
