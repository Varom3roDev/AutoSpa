import { createClient } from '@supabase/supabase-js';

export interface BcvSyncResult {
  success: boolean;
  rate?: number;
  fecha_valor?: string;
  source?: string;
  timestamp?: string;
  error?: string;
}

/**
 * Consulta la tasa BCV más reciente bajo Modalidad B (Fecha Valor).
 * Prioridad 1: Tabla 'tasas_bcv' en Supabase (alimentada por el scraper del usuario).
 * Prioridad 2: API pública oficial del BCV (mirror ve.dolarapi.com).
 */
export async function fetchLatestBcvRate(): Promise<BcvSyncResult> {
  let rate: number | null = null;
  let fechaValor = '';
  let source = '';

  // 1. Intentar consultar en Supabase tabla 'tasas_bcv'
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
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
    }
  } catch {
    // Si la tabla aún no existe o falla, continúa al mirror oficial
  }

  // 2. Si no se obtuvo de Supabase, consultar mirror oficial del BCV
  if (!rate) {
    try {
      const res = await fetch('https://ve.dolarapi.com/v1/dolares/oficial', {
        headers: { 'Accept': 'application/json' },
        cache: 'no-store',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.promedio) {
          rate = Number(json.promedio);
          fechaValor = json.fechaActualizacion || new Date().toISOString().split('T')[0];
          source = 'BCV Oficial (Fecha Valor)';
        }
      }
    } catch (err: any) {
      console.warn('Error fetching from BCV official mirror:', err?.message);
    }
  }

  if (!rate) {
    return {
      success: false,
      error: 'No se pudo obtener la tasa BCV de ninguna fuente disponible',
    };
  }

  return {
    success: true,
    rate,
    fecha_valor: fechaValor,
    source,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Determina si la tasa BCV debe actualizarse automáticamente.
 * Reglas:
 * 1. Debe estar en modo 'auto_b'.
 * 2. Si nunca se ha sincronizado -> true.
 * 3. Si han pasado más de 120 minutos (2 horas) -> true.
 * 4. Si en hora de Venezuela (UTC-4) ya son más de las 17:00 (5:00 PM) y la última sincronización
 *    ocurrió antes de las 17:00 del día de hoy -> true (para capturar la tasa del día hábil siguiente).
 */
export function shouldRefreshBcvRate(lastSyncedAt?: string | null, mode?: string | null): boolean {
  if (mode === 'manual') return false;
  if (!lastSyncedAt) return true;

  const lastSyncDate = new Date(lastSyncedAt);
  if (isNaN(lastSyncDate.getTime())) return true;

  const now = new Date();
  const diffMinutes = (now.getTime() - lastSyncDate.getTime()) / (1000 * 60);

  // Cada 2 horas como mínimo
  if (diffMinutes >= 120) return true;

  // Comprobar ventana de las 5:00 PM HLV (hora de publicación BCV)
  try {
    // Offset Venezuela UTC-4
    const vzlaNowHours = (now.getUTCHours() - 4 + 24) % 24;
    const vzlaLastSyncHours = (lastSyncDate.getUTCHours() - 4 + 24) % 24;
    const isSameVzlaDay =
      now.getUTCDate() === lastSyncDate.getUTCDate() &&
      now.getUTCMonth() === lastSyncDate.getUTCMonth() &&
      now.getUTCFullYear() === lastSyncDate.getUTCFullYear();

    if (vzlaNowHours >= 17 && (!isSameVzlaDay || vzlaLastSyncHours < 17)) {
      return true;
    }
  } catch {}

  return false;
}
