import { useState } from 'react';
import { Group, TextInput, Button, Title, Box, Flex, SimpleGrid, Center, Loader, Alert } from '@mantine/core';
import { IconSearch, IconPlus, IconAlertCircle } from '@tabler/icons-react';
import EmptyState from '../../shared/ui/EmptyState';
import { useNavigate } from 'react-router-dom';
import { useReportsList, type Reporte } from './hooks/useReportsList';
import ReportCard from './components/ReportCard';
import ReportEditModal from './components/ReportEditModal';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { reportes, loading, error, eliminarReporte } = useReportsList();
  
  const [editingReporte, setEditingReporte] = useState<Reporte | null>(null);

  const handleNewReport = () => {
    navigate('/reportes/nuevo');
  };

  const actionButton = (
    <Button 
      leftSection={<IconPlus size={16} />} 
      color="blue" 
      onClick={handleNewReport}
    >
      Nuevo Reporte
    </Button>
  );

  return (
    <Box>
      <Group justify="space-between" mb="xl">
        <Title order={2}>Reportes</Title>
      </Group>

      <Flex 
        gap="md" 
        mb="xl" 
        direction={{ base: 'column', sm: 'row' }} 
        justify="space-between"
      >
        <TextInput
          placeholder="Buscar por área o clave..."
          leftSection={<IconSearch size={16} />}
          w={{ base: '100%', sm: 300 }}
        />
        <Box display={{ base: 'none', sm: 'block' }}>
          {actionButton}
        </Box>
      </Flex>

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
      ) : reportes.length === 0 ? (
        <EmptyState
          title="No hay reportes aún"
          description="Crea el primero para comenzar."
          action={actionButton}
        />
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {reportes.map(reporte => (
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
