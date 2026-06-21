import { doc, updateDoc, collection, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../core/firebase';

// ─── Estado Circuito ──────────────────────────────────────────────────────────
export type EstadoCircuito = 'pendiente' | 'en_progreso' | 'realizado';

export const ESTADO_CIRCUITO_LABELS: Record<EstadoCircuito, string> = {
  pendiente:   'Pendiente',
  en_progreso: 'En Progreso',
  realizado:   'Realizado',
};

export const ESTADO_CIRCUITO_COLORS: Record<EstadoCircuito, string> = {
  pendiente:   'gray',
  en_progreso: 'blue',
  realizado:   'teal',
};

// ─── Estado Reporte ───────────────────────────────────────────────────────────
export type EstadoReporte = 'borrador' | 'en_revision' | 'completado';

export const ESTADO_REPORTE_LABELS: Record<EstadoReporte, string> = {
  borrador:    'Borrador',
  en_revision: 'En Revisión',
  completado:  'Completado',
};

export const ESTADO_REPORTE_COLORS: Record<EstadoReporte, string> = {
  borrador:    'orange',
  en_revision: 'violet',
  completado:  'green',
};

// ─── Helpers de UI ────────────────────────────────────────────────────────────

export function getCircuitoColor(estado?: string): string {
  return ESTADO_CIRCUITO_COLORS[(estado as EstadoCircuito) ?? 'pendiente'] ?? 'gray';
}

export function getCircuitoLabel(estado?: string): string {
  return ESTADO_CIRCUITO_LABELS[(estado as EstadoCircuito) ?? 'pendiente'] ?? 'Pendiente';
}

export function getReporteColor(estado?: string): string {
  return ESTADO_REPORTE_COLORS[(estado as EstadoReporte) ?? 'borrador'] ?? 'orange';
}

export function getReporteLabel(estado?: string): string {
  return ESTADO_REPORTE_LABELS[(estado as EstadoReporte) ?? 'borrador'] ?? 'Borrador';
}

// ─── Tipos de resultado de validación ────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  message?: string;   // mensaje principal
  details?: string[]; // lista de items problemáticos
}

// ─── Transiciones de Estado Circuito ─────────────────────────────────────────

/** Marca un circuito como "en_progreso". Valida que tenga al menos 1 par. */
export async function marcarCircuitoEnProgreso(
  reporteId: string,
  circuitoId: string,
  totalPares: number
): Promise<ValidationResult> {
  if (totalPares < 1) {
    return {
      valid: false,
      message: 'El circuito debe tener al menos un par fotográfico para pasar a "En Progreso".',
    };
  }
  await updateDoc(doc(db, 'reportes', reporteId, 'circuitos', circuitoId), {
    estado: 'en_progreso',
  });
  return { valid: true };
}

/** Marca un circuito como "realizado". Valida que tenga al menos 1 par. */
export async function marcarCircuitoRealizado(
  reporteId: string,
  circuitoId: string,
  totalPares: number
): Promise<ValidationResult> {
  if (totalPares < 1) {
    return {
      valid: false,
      message: 'El circuito debe tener al menos un par fotográfico para marcarse como "Realizado".',
    };
  }
  await updateDoc(doc(db, 'reportes', reporteId, 'circuitos', circuitoId), {
    estado: 'realizado',
    fechaRealizado: serverTimestamp(),
  });
  return { valid: true };
}

/** Cambia el estado de un circuito desde el modal de edición con validaciones. */
export async function actualizarEstadoCircuito(
  nuevoEstado: string,
  totalPares: number
): Promise<ValidationResult> {
  if (nuevoEstado === 'en_progreso' || nuevoEstado === 'realizado') {
    if (totalPares < 1) {
      return {
        valid: false,
        message: `No se puede cambiar a "${ESTADO_CIRCUITO_LABELS[nuevoEstado as EstadoCircuito]}" sin al menos un par fotográfico.`,
      };
    }
  }
  return { valid: true }; // la llamada real se hace junto a los otros campos en el modal
}

// ─── Transiciones de Estado Reporte ──────────────────────────────────────────

/** Carga todos los circuitos activos de un reporte. */
async function obtenerCircuitos(reporteId: string) {
  const q = query(
    collection(db, 'reportes', reporteId, 'circuitos'),
    orderBy('fechaCreacion', 'asc')
  );
  const snap = await getDocs(q);
  const circs: { id: string; nombre: string; estado?: string; totalPares: number }[] = [];
  snap.forEach((d) => {
    const data = d.data();
    if (!data.eliminado) {
      circs.push({ id: d.id, nombre: data.nombre, estado: data.estado, totalPares: data.totalPares || 0 });
    }
  });
  return circs;
}

/**
 * Marca un reporte como "en_revision".
 * Valida que todos los circuitos estén en "en_progreso" o "realizado".
 */
export async function marcarReporteEnRevision(reporteId: string): Promise<ValidationResult> {
  const circs = await obtenerCircuitos(reporteId);
  if (circs.length === 0) {
    return { valid: false, message: 'El reporte no tiene circuitos. Agregue al menos uno.' };
  }

  const pendientes = circs.filter(
    (c) => !c.estado || c.estado === 'pendiente'
  );
  if (pendientes.length > 0) {
    return {
      valid: false,
      message: 'Para marcar como "En Revisión", todos los circuitos deben estar en "En Progreso" o "Realizado".',
      details: pendientes.map((c) => `• ${c.nombre} (${getCircuitoLabel(c.estado)})`),
    };
  }

  await updateDoc(doc(db, 'reportes', reporteId), {
    estado: 'en_revision',
    fechaRevision: serverTimestamp(),
  });
  return { valid: true };
}

/**
 * Marca un reporte como "completado".
 * Valida que todos los circuitos estén en "realizado".
 */
export async function marcarReporteCompletado(reporteId: string): Promise<ValidationResult> {
  const circs = await obtenerCircuitos(reporteId);
  if (circs.length === 0) {
    return { valid: false, message: 'El reporte no tiene circuitos. Agregue al menos uno.' };
  }

  const noRealizados = circs.filter((c) => c.estado !== 'realizado');
  if (noRealizados.length > 0) {
    return {
      valid: false,
      message: 'Para marcar como "Completado", todos los circuitos deben estar en estado "Realizado".',
      details: noRealizados.map((c) => `• ${c.nombre} (${getCircuitoLabel(c.estado)})`),
    };
  }

  await updateDoc(doc(db, 'reportes', reporteId), {
    estado: 'completado',
    fechaCompletado: serverTimestamp(),
  });
  return { valid: true };
}

/**
 * Valida un cambio de estado desde el modal de edición de reporte.
 * No ejecuta la actualización — sólo retorna si es válido o no.
 */
export async function validarCambioEstadoReporte(
  reporteId: string,
  nuevoEstado: string
): Promise<ValidationResult> {
  if (nuevoEstado === 'en_revision') {
    const circs = await obtenerCircuitos(reporteId);
    const pendientes = circs.filter((c) => !c.estado || c.estado === 'pendiente');
    if (pendientes.length > 0) {
      return {
        valid: false,
        message: 'No puedes pasar a "En Revisión" con circuitos en estado "Pendiente".',
        details: pendientes.map((c) => `• ${c.nombre}`),
      };
    }
  }
  if (nuevoEstado === 'completado') {
    const circs = await obtenerCircuitos(reporteId);
    const noRealizados = circs.filter((c) => c.estado !== 'realizado');
    if (noRealizados.length > 0) {
      return {
        valid: false,
        message: 'No puedes marcar como "Completado" con circuitos que no estén en "Realizado".',
        details: noRealizados.map((c) => `• ${c.nombre} (${getCircuitoLabel(c.estado)})`),
      };
    }
  }
  return { valid: true };
}
