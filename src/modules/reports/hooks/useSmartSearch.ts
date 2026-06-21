import { useMemo } from 'react';
import type { Reporte } from './useReportsList';

// ─── Alias de estado del reporte ─────────────────────────────────────────────
const ESTADO_ALIASES: Record<string, string[]> = {
  borrador:    ['borrador', 'draft', 'borradores'],
  en_revision: ['revision', 'en revision', 'revisión', 'en revisión', 'en_revision', 'revisar'],
  completado:  ['completado', 'completo', 'completados', 'completos', 'done', 'finalizado', 'finalizada'],
};

// ─── Alias de tipo de formato ─────────────────────────────────────────────────
const TIPO_ALIASES: Record<string, string[]> = {
  a: ['tipo a', 'tipo_a', 'ta', 'a'],
  b: ['tipo b', 'tipo_b', 'tb', 'b'],
};

/**
 * Normaliza una cadena: sin tildes, minúsculas, sin espacios extras.
 */
function normalize(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Detecta si un token coincide con un estado del reporte.
 * Devuelve la clave de estado ('borrador' | 'en_revision' | 'completado') o null.
 */
function detectEstado(token: string): string | null {
  const norm = normalize(token);
  for (const [estado, aliases] of Object.entries(ESTADO_ALIASES)) {
    if (aliases.some((alias) => normalize(alias) === norm || normalize(alias).includes(norm) || norm.includes(normalize(alias)))) {
      return estado;
    }
  }
  return null;
}

/**
 * Detecta si un token coincide con un tipo de formato (A o B).
 * Devuelve 'a', 'b', o null.
 */
function detectTipo(token: string): string | null {
  const norm = normalize(token);
  for (const [tipo, aliases] of Object.entries(TIPO_ALIASES)) {
    if (aliases.some((alias) => normalize(alias) === norm)) {
      return tipo;
    }
  }
  return null;
}

export interface ParsedQuery {
  tipo: string | null;         // 'a' | 'b' | null
  estado: string | null;       // 'borrador' | 'en_revision' | 'completado' | null
  textoLibre: string[];        // palabras sueltas para buscar en zona / área / revisor
}

/**
 * Parsea una cadena de búsqueda libre en tokens semánticos.
 * Ejemplos:
 *   "tipo b borrador" → { tipo: 'b', estado: 'borrador', textoLibre: [] }
 *   "villaflores b"   → { tipo: 'b', estado: null, textoLibre: ['villaflores'] }
 *   "Ing. Alberto en revision" → { tipo: null, estado: 'en_revision', textoLibre: ['ing', 'alberto'] }
 */
export function parseQuery(rawQuery: string): ParsedQuery {
  const result: ParsedQuery = { tipo: null, estado: null, textoLibre: [] };
  if (!rawQuery.trim()) return result;

  // Primero, intentar detectar frases de dos palabras (ej. "en revision", "tipo a")
  const normalized = normalize(rawQuery);

  // Detectar "en revision" / "en revisión" como frase completa
  for (const [estado, aliases] of Object.entries(ESTADO_ALIASES)) {
    for (const alias of aliases) {
      if (normalized.includes(normalize(alias))) {
        result.estado = estado;
        // Eliminar la frase del texto para no procesarla otra vez
        rawQuery = rawQuery.replace(new RegExp(alias, 'gi'), ' ');
        break;
      }
    }
    if (result.estado) break;
  }

  // Detectar "tipo a" / "tipo b" como frase
  for (const [tipo, aliases] of Object.entries(TIPO_ALIASES)) {
    for (const alias of aliases) {
      if (normalize(alias).length > 1 && normalized.includes(normalize(alias))) {
        if (!result.tipo) result.tipo = tipo;
        rawQuery = rawQuery.replace(new RegExp(alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ');
        break;
      }
    }
    if (result.tipo) break;
  }

  // Ahora separar los tokens restantes
  const tokens = rawQuery.split(/\s+/).map((t) => t.trim()).filter(Boolean);

  for (const token of tokens) {
    // Intentar detectar estado individual
    if (!result.estado) {
      const estadoDetect = detectEstado(token);
      if (estadoDetect) {
        result.estado = estadoDetect;
        continue;
      }
    }

    // Intentar detectar tipo individual ("a" o "b" solos o "a" / "b" en combinación)
    if (!result.tipo) {
      const tipoDetect = detectTipo(token);
      if (tipoDetect) {
        result.tipo = tipoDetect;
        continue;
      }
    }

    // Si no fue reconocido como tipo ni estado, va a texto libre
    const normToken = normalize(token);
    if (normToken.length >= 1) {
      result.textoLibre.push(normToken);
    }
  }

  return result;
}

/**
 * Aplica la consulta parseada sobre una lista de Reportes.
 */
function matchesReporte(reporte: Reporte, query: ParsedQuery): boolean {
  // Filtro por tipo
  if (query.tipo !== null) {
    const tipoReporte = normalize(reporte.tipoFormato || '');
    if (tipoReporte !== normalize(query.tipo)) return false;
  }

  // Filtro por estado
  if (query.estado !== null) {
    const estadoReporte = normalize(reporte.estado || 'borrador');
    if (estadoReporte !== normalize(query.estado)) return false;
  }

  // Filtro por texto libre (zona, área, revisor, número de estimación)
  if (query.textoLibre.length > 0) {
    const searchableFields = [
      normalize(reporte.zonaNombre || ''),
      normalize(reporte.areaNombre || ''),
      normalize(reporte.revisorNombre || ''),
      normalize(reporte.numeroEstimacion || ''),
    ].join(' ');

    // Todos los tokens deben aparecer en alguno de los campos
    const allMatch = query.textoLibre.every((token) =>
      searchableFields.includes(token)
    );
    if (!allMatch) return false;
  }

  return true;
}

/**
 * Hook reactivo de búsqueda inteligente.
 * Recibe la lista completa de reportes y la cadena de búsqueda.
 * Devuelve la lista filtrada y la query parseada (para mostrar chips/hints al usuario).
 */
export function useSmartSearch(reportes: Reporte[], rawQuery: string) {
  const parsedQuery = useMemo(() => parseQuery(rawQuery), [rawQuery]);

  const filteredReportes = useMemo(() => {
    if (!rawQuery.trim()) return reportes;
    return reportes.filter((r) => matchesReporte(r, parsedQuery));
  }, [reportes, rawQuery, parsedQuery]);

  return { filteredReportes, parsedQuery };
}
