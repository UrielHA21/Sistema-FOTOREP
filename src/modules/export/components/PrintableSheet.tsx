import { Paper, Box, Image, Text, SimpleGrid, Center, Flex } from '@mantine/core';
import cfeLogo from '../../../assets/CFE_icono.png';
import type { ParFotograficoPlano } from '../hooks/usePreviewData';

interface PrintableSheetProps {
  zonaNombre: string;
  areaNombre: string;
  tipoReporte?: string;
  numeroEstimacion?: string;
  realizaNombre?: string;
  realizaCargo?: string;
  revisaNombre?: string;
  revisaCargo?: string;
  /** Estilos adicionales para el modo Ancho de Página (aspect-ratio, maxWidth, etc.) */
  anchoStyle?: React.CSSProperties;
  paresChunk: ParFotograficoPlano[];
}

// ---- Slot de imagen reutilizable (Etiqueta ARRIBA) ----
function ImageSlot({ url, label, height }: { url: string | null; label: string; height: string | number }) {
  return (
    <Box>
      <Text ta="center" fw={700} mb={4} style={{ fontSize: '10.6px', letterSpacing: 0.5 }}>{label}:</Text>
      <Box
        bg="gray.1"
        style={{
          width: '100%',
          height,
          border: '1px solid #333',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {url ? (
          <Image src={url} width="100%" height="100%" fit="cover" />
        ) : (
          <Center h="100%"><Text c="dimmed" size="xs">SIN IMAGEN</Text></Center>
        )}
      </Box>
    </Box>
  );
}

// ---- Área de firma reutilizable (Sin divisores) ----
function SignatureArea({ title, nombre, cargo }: { title: string; nombre?: string; cargo?: string }) {
  return (
    <Box style={{ textAlign: 'center' }}>
      <Text fw={700} mb={40} style={{ fontSize: '9.3px' }}>{title}</Text>
      <Box style={{ position: 'relative', width: '220px', margin: '0 auto' }}>
        <Box style={{ height: '0.8px', background: '#000', marginBottom: 4 }} />
        <Text
          style={{
            fontSize: '9px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {nombre || '___________________________'}
        </Text>
        <Text
          c="gray.7"
          style={{
            fontSize: '8.5px',
            lineHeight: 1.2,
            marginTop: 2
          }}
        >
          {cargo || ''}
        </Text>
      </Box>
    </Box>
  );
}

export default function PrintableSheet({
  zonaNombre,
  areaNombre,
  tipoReporte,
  numeroEstimacion,
  realizaNombre,
  realizaCargo,
  revisaNombre,
  anchoStyle,
  paresChunk,
}: PrintableSheetProps) {
  const isSingleMode = paresChunk.length === 1;

  // Nombre del circuito(s) para la cabecera (únicos en el chunk)
  const circuitosEnChunk = [...new Set(paresChunk.map(p => p.circuitoNombre || ''))].join(' / ');

  // Inyección de cargo dinámico del revisor
  const dynamicRevisaCargo = `JEFE DE ÁREA DE DISTRIBUCION ${areaNombre.toUpperCase()}`;

  return (
    <Paper
      bg="white"
      shadow="sm"
      mx="auto"
      my="xl"
      style={{
        width: '215.9mm',
        minHeight: '279.4mm',
        padding: '1.8cm',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        ...anchoStyle,
      }}
    >
      {/* ============ CABECERA INSTITUCIONAL ============ */}
      <Flex
        justify="space-between"
        align="flex-start"
        pb="sm"
        mb="sm"
        style={{
          borderBottom: '1px solid #000',
          position: 'relative',
          flexShrink: 0
        }}
      >
        <Box
          style={{
            position: 'absolute',
            bottom: '3px',
            left: 0,
            right: 0,
            height: '1.5px',
            background: '#000'
          }}
        />

        <Flex align="center" gap="sm" style={{ width: '58%' }}>
          <Image src={cfeLogo} w={85} h="auto" fit="contain" style={{ flexShrink: 0 }} />
          <Box ta="center">
            <Text fw={700} lh={1.1} style={{ fontSize: '13.3px' }}>COMISIÓN FEDERAL DE ELECTRICIDAD</Text>
            <Text fw={700} lh={1.1} style={{ fontSize: '13.3px' }}>DIVISIÓN SURESTE</Text>
            <Text fw={700} lh={1.1} style={{ fontSize: '13.3px' }}>FORMATO DE EVIDENCIA FOTOGRÁFICA</Text>
          </Box>
        </Flex>

        <Box style={{ width: '42%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.6px' }}>
            <tbody>
              <tr>
                <td style={{ padding: '2px 4px', width: '55%', whiteSpace: 'nowrap' }}>
                  <strong>ZONA:</strong> {zonaNombre.toUpperCase()}
                </td>
                <td style={{ padding: '2px 4px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  <strong>TIPO:</strong> {tipoReporte || 'REPORTE'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '2px 4px', whiteSpace: 'nowrap' }}>
                  <strong>ÁREA:</strong> {areaNombre.toUpperCase()}
                </td>
                <td style={{ padding: '2px 4px', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                  <strong>CIRCUITO:</strong> {circuitosEnChunk.toUpperCase()}
                </td>
              </tr>
              <tr>
                <td colSpan={2} style={{ padding: '2px 4px', whiteSpace: 'nowrap' }}>
                  <strong>ESTIMACIÓN No.:</strong> {numeroEstimacion || '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </Box>
      </Flex>

      {/* ============ CUERPO DEL REPORTE (Maquetación Rígida) ============ */}
      <Box
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: isSingleMode ? 'center' : 'flex-start',
          border: '1.2px solid #000',
          padding: '24px 32px',
          marginBottom: 10,
        }}
      >
        {paresChunk.map((item) => (
          <Box
            key={item.id}
            mb={isSingleMode ? 0 : 'xl'}
            style={{ position: 'relative' }}
          >
            {isSingleMode ? (
              /* MODO 1 PAR: APILADO VERTICAL */
              <Box style={{ width: '82%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
                <ImageSlot url={item.urlAntes} label="ANTES" height={280} />
                <ImageSlot url={item.urlDespues} label="DESPUÉS" height={280} />
              </Box>
            ) : (
              /* MODO 3 PARES: GRID HORIZONTAL (2 COLUMNAS) */
              <SimpleGrid cols={2} spacing={40}>
                <ImageSlot url={item.urlAntes} label="ANTES" height={190} />
                <ImageSlot url={item.urlDespues} label="DESPUÉS" height={190} />
              </SimpleGrid>
            )}
          </Box>
        ))}
      </Box>

      {/* ============ PIE DE PÁGINA / FIRMAS ============ */}
      <SimpleGrid cols={2} spacing={60} style={{ pt: 'sm' }}>
        <SignatureArea title="REALIZA:" nombre={realizaNombre} cargo={realizaCargo} />
        <SignatureArea title="REVISA:" nombre={revisaNombre} cargo={dynamicRevisaCargo} />
      </SimpleGrid>
    </Paper>
  );
}
