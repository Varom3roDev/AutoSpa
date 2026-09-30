import { NextResponse } from 'next/server';
import { fetchLatestBcvRate } from '@/lib/bcv';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SETTINGS_FILE = path.join(process.cwd(), '.app_settings.json');

export async function GET(req: Request) {
  try {
    const result = await fetchLatestBcvRate();
    if (!result.success || !result.rate) {
      return NextResponse.json({ error: result.error || 'Fallo sincronización BCV' }, { status: 502 });
    }

    // 1. Guardar localmente
    try {
      let settings: any = {};
      if (fs.existsSync(SETTINGS_FILE)) {
        settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      }
      settings.bcv_exchange_rate = result.rate;
      settings.bcv_last_synced_at = result.timestamp || new Date().toISOString();
      settings.bcv_fecha_valor = result.fecha_valor;
      settings.updated_at = new Date().toISOString();
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Cron: error guardando local:', e);
    }

    // 2. Guardar en Supabase
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseKey) {
        const client = createClient(supabaseUrl, supabaseKey);
        await client.from('app_settings').upsert({
          id: 'default',
          bcv_exchange_rate: result.rate,
          bcv_last_synced_at: result.timestamp || new Date().toISOString(),
          bcv_fecha_valor: result.fecha_valor,
          bcv_rate_mode: 'auto_b',
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('Cron: error guardando Supabase:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Tasa BCV sincronizada automáticamente por Cron Job',
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error en Cron BCV' }, { status: 500 });
  }
}
