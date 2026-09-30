import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fetchLatestBcvRate, shouldRefreshBcvRate } from '@/lib/bcv';

export const dynamic = 'force-dynamic';

const SETTINGS_FILE = path.join(process.cwd(), '.app_settings.json');

const DEFAULT_SETTINGS = {
  id: 'default',
  bcv_exchange_rate: 859.06,
  bcv_rate_mode: 'auto_b',
  bcv_last_synced_at: null,
  bcv_fecha_valor: null,
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
    let settings: any = null;

    // 1. Intentar leer de Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        const client = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await client.from('app_settings').select('*').eq('id', 'default').single();
        if (!error && data) {
          settings = data;
          writeLocalSettings(data);
        }
      } catch {}
    }

    // 2. Si no se obtuvo de Supabase, leer del archivo local
    if (!settings) {
      settings = readLocalSettings();
    }

    // 3. AUTO-ACTUALIZACIÓN CONTINUA DESATENDIDA:
    // Si está en 'auto_b' y toca refrescar (tiempo transcurrido o cambio de hora de cierre BCV)
    if (shouldRefreshBcvRate(settings.bcv_last_synced_at, settings.bcv_rate_mode)) {
      try {
        const syncResult = await fetchLatestBcvRate();
        if (syncResult.success && syncResult.rate) {
          settings.bcv_exchange_rate = syncResult.rate;
          settings.bcv_last_synced_at = syncResult.timestamp || new Date().toISOString();
          settings.bcv_fecha_valor = syncResult.fecha_valor;
          settings.updated_at = new Date().toISOString();

          // Guardar local
          writeLocalSettings(settings);

          // Guardar en Supabase en segundo plano si está disponible
          if (supabaseUrl && supabaseKey) {
            try {
              const client = createClient(supabaseUrl, supabaseKey);
              await client.from('app_settings').upsert({
                id: 'default',
                bcv_exchange_rate: settings.bcv_exchange_rate,
                bcv_rate_mode: settings.bcv_rate_mode,
                bcv_last_synced_at: settings.bcv_last_synced_at,
                bcv_fecha_valor: settings.bcv_fecha_valor,
                home_banner_title: settings.home_banner_title,
                home_banner_text: settings.home_banner_text,
                support_whatsapp: settings.support_whatsapp,
                updated_at: settings.updated_at,
              });
            } catch {}
          }
        }
      } catch (syncErr) {
        // En caso de corte momentáneo de internet, no bloquea: continúa usando la tasa previa
        console.warn('Auto-sync BCV failed, preserving existing rate:', syncErr);
      }
    }

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
      bcv_rate_mode: body.bcv_rate_mode || current.bcv_rate_mode || 'auto_b',
      bcv_last_synced_at: body.bcv_last_synced_at ?? current.bcv_last_synced_at,
      bcv_fecha_valor: body.bcv_fecha_valor ?? current.bcv_fecha_valor,
      updated_at: new Date().toISOString(),
    };

    // 1. Guardar local
    writeLocalSettings(merged);

    // 2. Guardar en Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      try {
        const client = createClient(supabaseUrl, supabaseKey);
        await client.from('app_settings').upsert({
          id: 'default',
          bcv_exchange_rate: merged.bcv_exchange_rate,
          bcv_rate_mode: merged.bcv_rate_mode,
          bcv_last_synced_at: merged.bcv_last_synced_at,
          bcv_fecha_valor: merged.bcv_fecha_valor,
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
