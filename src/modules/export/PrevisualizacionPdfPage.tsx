import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container, Box, Group, Button, Select, Center, Loader, Title, Text,
  Badge, ActionIcon, Tooltip,
} from '@mantine/core';
import {
  IconChevronLeft, IconFileTypePdf,
  IconFile, IconArrowsHorizontal,
} from '@tabler/icons-react';
import PrintableSheet from './components/PrintableSheet';
import { usePreviewData, type ParFotograficoPlano } from './hooks/usePreviewData';
import { useGeneratePDF } from './hooks/useGeneratePDF';

type ViewMode = 'una' | 'ancho';

export default function PrevisualizacionPdfPage() {
  const { reporteId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();

  // Leer estado inyectado desde ExportacionPage
  const circuitosAExportar: string[]            = state?.selectedCircuits || [];
  const exportQuantities: Record<string, number> = state?.exportQuantities || {};
  const paresPorHojaInicial: string             = state?.paresPorHoja     || '3';

  const { isLoading, reporteMeta, paresPlanos, firmaRealiza, firmaRevisa } = usePreviewData(
    reporteId,
    circuitosAExportar,
    exportQuantities
  );

  const [paresPorPagina, setParesPorPagina] = useState<string>(paresPorHojaInicial);
  const [viewMode, setViewMode] = useState<ViewMode>('una');
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  // ── Listener de reajuste de ventana ──
  useEffect(() => {
    const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── PDF generation hook ──
  const { isGenerating, downloadPdf } = useGeneratePDF();

  // Chunking aislado por circuito
  const buildPaginasPorCircuito = (
    pares: ParFotograficoPlano[],
    n: number
  ): ParFotograficoPlano[][] => {
    const circuitosOrdenados = [...new Set(pares.map((p) => p.circuitoNombre))];
    const todasLasPaginas: ParFotograficoPlano[][] = [];
    circuitosOrdenados.forEach((nombre) => {
      const parciales = pares.filter((p) => p.circuitoNombre === nombre);
      for (let i = 0; i < parciales.length; i += n) {
        todasLasPaginas.push(parciales.slice(i, i + n));
      }
    });
    return todasLasPaginas;
  };

  const paginasRenderizadas = buildPaginasPorCircuito(paresPlanos, parseInt(paresPorPagina));

  // ── Lógica de Zoom mediante Transform Scale ──
  // Dimensiones base de referencia para una hoja Carta (Letter)
  const BASE_SHEET_W = 816; // 8.5in * 96dpi
  const BASE_SHEET_H = 1056; // 11in * 96dpi

  const zoomFactor = useMemo(() => {
    if (viewMode === 'una') {
      // Ajustar al alto disponible (Viewport - barras superiores)
      const availableH = windowSize.h - 180;
      return availableH / BASE_SHEET_H;
    } else {
      // Ajustar al ancho (Simular ancho de página, usando 1200px como referencia de "zoom" razonable)
      return 1.4; // Zoom fijo potente para el modo ancho
    }
  }, [viewMode, windowSize]);

  const sheetContainerStyle: React.CSSProperties = {
    transform: `scale(${zoomFactor})`,
    transformOrigin: 'top center',
    width: BASE_SHEET_W,
    height: BASE_SHEET_H,
    margin: '0 auto',
    flexShrink: 0,
  };

  // ── Handler de descarga ──
  const handleGenerarPDF = () => {
    downloadPdf(reporteMeta, firmaRealiza, firmaRevisa, paginasRenderizadas, parseInt(paresPorPagina, 10));
  };

  if (isLoading) return (
    <Center h="80vh" style={{ flexDirection: 'column' }}>
      <Loader color="blue" size="xl" type="dots" />
      <Text mt="md" fw={500} c="dimmed">Construyendo previsualización...</Text>
    </Center>
  );

  return (
    <Box bg="gray.2" style={{ minHeight: '100vh', paddingBottom: '5rem' }}>
      {/* ============ BARRA SUPERIOR FIJA ============ */}
      <Box
        pos="sticky"
        top={60}
        bg="white"
        px="xl"
        py="sm"
        style={{ borderBottom: '1px solid var(--mantine-color-gray-3)', zIndex: 100, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
      >
        <Container size="xl">
          <Group justify="space-between" wrap="nowrap">
            {/* Izquierda: Navegación + Breadcrumb */}
            <Group gap="xs" wrap="nowrap" style={{ overflow: 'hidden' }}>
              <Button
                variant="subtle"
                color="gray"
                leftSection={<IconChevronLeft size={16} />}
                onClick={() => navigate(`/reportes/${reporteId}/exportar`)}
                px={0}
                style={{ flexShrink: 0 }}
              >
                Volver
              </Button>
              <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>|</Text>
              <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <strong>Zona:</strong> {reporteMeta?.zonaNombre || '—'}
                {' / '}
                <strong>Área:</strong> {reporteMeta?.areaNombre || '—'}
                {' / '}
                <strong>Estimación:</strong> {reporteMeta?.numeroEstimacion || '—'}
              </Text>
            </Group>

            {/* Centro: Controles de Vista (estilo Word) */}
            <Group gap={4} style={{ flexShrink: 0 }}>
              <Tooltip label="Hoja Completa (Ajustar al alto)" withArrow>
                <ActionIcon
                  variant={viewMode === 'una' ? 'filled' : 'default'}
                  color={viewMode === 'una' ? 'blue' : 'gray'}
                  onClick={() => setViewMode('una')}
                >
                  <IconFile size={18} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Ancho de Página" withArrow>
                <ActionIcon
                  variant={viewMode === 'ancho' ? 'filled' : 'default'}
                  color={viewMode === 'ancho' ? 'blue' : 'gray'}
                  onClick={() => setViewMode('ancho')}
                >
                  <IconArrowsHorizontal size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>

            {/* Derecha: Select + Badge páginas + Botón PDF */}
            <Group gap="xs" style={{ flexShrink: 0 }}>
              <Select
                w={170}
                size="xs"
                value={paresPorPagina}
                onChange={(v) => setParesPorPagina(v || '3')}
                data={[
                  { value: '1', label: '1 par por página' },
                  { value: '3', label: '3 pares por página' },
                ]}
                allowDeselect={false}
              />
              <Badge variant="light" color="gray" size="md" style={{ flexShrink: 0 }}>
                {paginasRenderizadas.length} pág.
              </Badge>
              <Button
                color="red.7"
                size="xs"
                leftSection={<IconFileTypePdf size={16} />}
                loading={isGenerating}
                disabled={paginasRenderizadas.length === 0 || isGenerating}
                onClick={handleGenerarPDF}
              >
                {isGenerating ? 'Generando...' : 'Generar PDF'}
              </Button>
            </Group>
          </Group>
        </Container>
      </Box>

      {/* ============ MOTOR GRÁFICO PDF (Hojas) ============ */}
      <Box pt="xl" style={{ width: '100%', overflowX: 'auto' }}>
        {paginasRenderizadas.length === 0 ? (
          <Center h="40vh" style={{ flexDirection: 'column' }}>
            <Title order={3} c="dimmed">No hay evidencias activas</Title>
            <Text c="dimmed">Selecciona circuitos en el Dashboard de Exportación.</Text>
          </Center>
        ) : (
          <Box style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
            {paginasRenderizadas.map((chunk, index) => (
              <Box 
                key={`wrapper-${index}`} 
                style={{ 
                  ...sheetContainerStyle,
                  marginBottom: `calc(${BASE_SHEET_H}px * (${zoomFactor} - 1) + 20px)` 
                }}
              >
                <PrintableSheet
                  zonaNombre={reporteMeta?.zonaNombre || '—'}
                  areaNombre={reporteMeta?.areaNombre || '—'}
                  tipoReporte={reporteMeta?.tipoFormato ? `TIPO ${reporteMeta.tipoFormato}` : undefined}
                  numeroEstimacion={reporteMeta?.numeroEstimacion}
                  realizaNombre={firmaRealiza.nombre}
                  realizaCargo={firmaRealiza.cargo}
                  revisaNombre={firmaRevisa.nombre}
                  revisaCargo={firmaRevisa.cargo}
                  paresChunk={chunk}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
