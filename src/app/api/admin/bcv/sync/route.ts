import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let rate: number | null = null;
    let fechaValor = '';
    let source = '';

    // 1. Intentar consultar en Supabase tabla 'tasas_bcv' (poblada por api-bcv-scraper)
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('tasas_bcv')
        .select('*')
        .order('fecha_valor_fecha', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data && data.tasa) {
        rate = Number(data.tasa);
        fechaValor = data.fecha_valor_texto || data.fecha_valor_fecha;
        source = 'Supabase (api-bcv-scraper)';
      }
    } catch {
      // Si la tabla aún no está creada en Supabase, continúa al respaldo
    }

    // 2. Si no está en Supabase, consultar la API oficial del BCV (Modalidad B - Fecha Valor)
    if (!rate) {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        if (json.promedio) {
          rate = Number(json.promedio);
          fechaValor = json.fechaActualizacion || new Date().toISOString().split('T')[0];
          source = 'BCV Oficial (Fecha Valor)';
        }
      }
    }

    if (!rate) {
      return NextResponse.json({ error: 'No se pudo obtener la tasa BCV' }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      rate,
      fecha_valor: fechaValor,
      source,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Error al sincronizar tasa BCV' }, { status: 500 });
  }
}
