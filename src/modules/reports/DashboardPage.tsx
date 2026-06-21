import { useState, useRef } from 'react';
import {
  Group, TextInput, Button, Title, Box, Flex, SimpleGrid,
  Center, Loader, Alert, Badge, Text, ActionIcon, Tooltip,
  Kbd, Stack,
} from '@mantine/core';
import { IconSearch, IconPlus, IconAlertCircle, IconX, IconSparkles } from '@tabler/icons-react';
import EmptyState from '../../shared/ui/EmptyState';
import { useNavigate } from 'react-router-dom';
import { useReportsList, type Reporte } from './hooks/useReportsList';
import ReportCard from './components/ReportCard';
import ReportEditModal from './components/ReportEditModal';
import { useAccessibilityStore } from '../accessibility/store';
import { useMediaQuery } from '@mantine/hooks';
import { useSmartSearch } from './hooks/useSmartSearch';

// ─── Chips de filtros detectados ─────────────────────────────────────────────
const ESTADO_CHIP_LABELS: Record<string, { label: string; color: string }> = {
  borrador:    { label: 'Borrador',     color: 'orange' },
  en_revision: { label: 'En Revisión',  color: 'violet' },
  completado:  { label: 'Completado',   color: 'green'  },
};

const TIPO_CHIP_LABELS: Record<string, { label: string; color: string }> = {
  a: { label: 'Tipo A', color: 'blue' },
  b: { label: 'Tipo B', color: 'teal' },
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const { reportes, loading, error, eliminarReporte } = useReportsList();
  const { simpleMode } = useAccessibilityStore();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const showText = !isMobile && !simpleMode;

  const [editingReporte, setEditingReporte] = useState<Reporte | null>(null);

  // ─── Estado de búsqueda ─────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState('');
  const [activeQuery, setActiveQuery] = useState('');   // se aplica al presionar Buscar o Enter
  const inputRef = useRef<HTMLInputElement>(null);

  const { filteredReportes, parsedQuery } = useSmartSearch(reportes, activeQuery);

  const hasActiveSearch = activeQuery.trim().length > 0;
  const noResults = hasActiveSearch && filteredReportes.length === 0 && !loading;

  const handleSearch = () => {
    setActiveQuery(inputValue);
  };

  const handleClearSearch = () => {
    setInputValue('');
    setActiveQuery('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch();
    if (e.key === 'Escape') handleClearSearch();
  };

  const handleNewReport = () => {
    navigate('/reportes/nuevo');
  };

  const actionButton = (
    <Group gap="sm">
      <Button
        variant="light"
        color="gray"
        onClick={() => navigate('/historial-pdf')}
        title={!showText ? 'Historial de PDFs' : undefined}
        aria-label="Historial de PDFs"
        leftSection={showText ? <IconAlertCircle size={16} /> : undefined}
        px={showText ? undefined : 'xs'}
      >
        {showText ? 'Historial de PDFs' : <IconAlertCircle size={16} />}
      </Button>
      <Button
        color="blue"
        onClick={handleNewReport}
        title={!showText ? 'Nuevo Reporte' : undefined}
        aria-label="Nuevo Reporte"
        leftSection={showText ? <IconPlus size={16} /> : undefined}
        px={showText ? undefined : 'xs'}
      >
        {showText ? 'Nuevo Reporte' : <IconPlus size={16} />}
      </Button>
    </Group>
  );

  // ─── Chips de filtros activos ────────────────────────────────────────────────
  const activeChips: React.ReactNode[] = [];
  if (parsedQuery.tipo && TIPO_CHIP_LABELS[parsedQuery.tipo]) {
    const chip = TIPO_CHIP_LABELS[parsedQuery.tipo];
    activeChips.push(
      <Badge key="tipo" color={chip.color} variant="filled" size="sm">
        {chip.label}
      </Badge>
    );
  }
  if (parsedQuery.estado && ESTADO_CHIP_LABELS[parsedQuery.estado]) {
    const chip = ESTADO_CHIP_LABELS[parsedQuery.estado];
    activeChips.push(
      <Badge key="estado" color={chip.color} variant="filled" size="sm">
        {chip.label}
      </Badge>
    );
  }
  parsedQuery.textoLibre.forEach((token, i) => {
    activeChips.push(
      <Badge key={`libre-${i}`} color="gray" variant="light" size="sm">
        {token}
      </Badge>
    );
  });

  const reportesAMostrar = hasActiveSearch ? filteredReportes : reportes;

  return (
    <Box>
      <Group justify="space-between" mb="xl">
        <Title order={2}>Formato de Evidencia Fotográfica</Title>
      </Group>

      {/* ── Barra de búsqueda inteligente ────────────────────────────── */}
      <Stack gap="xs" mb="xl">
        <Flex
          gap="sm"
          direction={{ base: 'column', sm: 'row' }}
          justify="space-between"
          align={{ base: 'stretch', sm: 'flex-start' }}
        >
          {/* Input de búsqueda */}
          <Box style={{ flex: 1, maxWidth: 560, position: 'relative' }}>
            <TextInput
              ref={inputRef}
              id="smart-search-input"
              placeholder="Buscar... ej: Villaflores B, Tuxtla A borrador, Ing. García en revisión"
              leftSection={<IconSearch size={16} />}
              rightSection={
                inputValue ? (
                  <Tooltip label="Limpiar búsqueda" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      onClick={handleClearSearch}
                      aria-label="Limpiar búsqueda"
                    >
                      <IconX size={14} />
                    </ActionIcon>
                  </Tooltip>
                ) : undefined
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.currentTarget.value)}
              onKeyDown={handleKeyDown}
              aria-label="Búsqueda inteligente de reportes"
              styles={{
                input: {
                  borderRadius: 8,
                  transition: 'box-shadow 0.2s',
                },
              }}
            />
            {/* Hint debajo del input */}
            <Text size="xs" c="dimmed" mt={4} pl={4}>
              Escribe combinaciones: zona · área · tipo A / B · estado · revisor. Presiona{' '}
              <Kbd size="xs">Enter</Kbd> o el botón Buscar.
            </Text>
          </Box>

          {/* Botones derecha */}
          <Group gap="sm" align="flex-start">
            <Button
              id="smart-search-btn"
              leftSection={<IconSparkles size={16} />}
              variant="filled"
              color="blue"
              onClick={handleSearch}
              aria-label="Buscar reportes"
            >
              Buscar
            </Button>
            <Box display={{ base: 'none', sm: 'block' }}>
              {actionButton}
            </Box>
          </Group>
        </Flex>

        {/* Chips de filtros activos */}
        {hasActiveSearch && (
          <Group gap="xs" align="center">
            <Text size="xs" c="dimmed" fw={500}>Filtros activos:</Text>
            {activeChips.length > 0 ? (
              activeChips
            ) : (
              <Badge color="gray" variant="light" size="sm">texto libre</Badge>
            )}
            <ActionIcon
              variant="subtle"
              color="red"
              size="xs"
              onClick={handleClearSearch}
              aria-label="Quitar filtros"
              title="Quitar filtros"
            >
              <IconX size={12} />
            </ActionIcon>
            <Text size="xs" c="dimmed">
              · {filteredReportes.length} resultado{filteredReportes.length !== 1 ? 's' : ''}
            </Text>
          </Group>
        )}
      </Stack>

      <Box display={{ base: 'block', sm: 'none' }} mb="xl">
        {actionButton}
      </Box>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} title="Error al cargar" color="red" mb="xl" variant="light">
          {error}
        </Alert>
      )}

      {loading ? (
        <Center py={80}><Loader color="blue" type="bars" /></Center>
      ) : noResults ? (
        /* Sin resultados para esta búsqueda */
        <Center py={60} style={{ flexDirection: 'column', gap: 12 }}>
          <IconSearch size={48} color="var(--mantine-color-gray-5)" />
          <Text fw={600} size="lg" c="dimmed">Sin resultados</Text>
          <Text size="sm" c="dimmed" ta="center" maw={400}>
            No se encontraron reportes para <strong>"{activeQuery}"</strong>.
            Intenta con otra combinación o limpia la búsqueda.
          </Text>
          <Button variant="light" color="gray" leftSection={<IconX size={14} />} onClick={handleClearSearch} mt="xs">
            Limpiar búsqueda
          </Button>
        </Center>
      ) : reportesAMostrar.length === 0 ? (
        <EmptyState
          title="No hay reportes aún"
          description="Crea el primero para comenzar."
          action={actionButton}
        />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {reportesAMostrar.map(reporte => (
            <ReportCard key={reporte.id} reporte={reporte} onEliminar={eliminarReporte} onEdit={(r) => setEditingReporte(r)} />
          ))}
        </SimpleGrid>
      )}

      {/* MODAL DE EDICIÓN AISLADO CON LAZY LOAD */}
      <ReportEditModal
        opened={!!editingReporte}
        onClose={() => setEditingReporte(null)}
        reporte={editingReporte}
      />
    </Box>
  );
}
