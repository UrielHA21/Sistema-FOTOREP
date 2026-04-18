import { Card, Badge, Group, Title, Text, Button, ActionIcon, Menu } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { modals } from '@mantine/modals';
import { IconDotsVertical, IconEdit, IconTrash, IconDownload } from '@tabler/icons-react';
import type { Reporte } from '../hooks/useReportsList';

interface ReportCardProps {
  reporte: Reporte;
  onEliminar: (reporteId: string) => void;
  onEdit: (reporte: Reporte) => void;
}

export default function ReportCard({ reporte, onEliminar, onEdit }: ReportCardProps) {
  const navigate = useNavigate();

  const handleEdit = () => {
    navigate(`/reportes/${reporte.id}/circuitos`);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Sincronizando...';
    // Firestore timestamp
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
           <Badge color="gray" variant="light">
             {(reporte.estado || 'BORRADOR').toUpperCase()}
           </Badge>
           <Badge color="blue" variant="outline">
             TIPO {reporte.tipoFormato || 'FORMATO'}
           </Badge>
        </Group>
        
        <Group gap="xs">
           <Text size="xs" c="dimmed">{formatDate(reporte.fechaCreacion)}</Text>
           
           <Menu position="bottom-end" shadow="sm">
              <Menu.Target>
                 <ActionIcon variant="subtle" color="gray" size="sm">
                    <IconDotsVertical size={16} />
                 </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                 <Menu.Item leftSection={<IconEdit size={14}/>} onClick={() => onEdit(reporte)}>
                    Editar Información
                 </Menu.Item>
                 <Menu.Item color="red" leftSection={<IconTrash size={14}/>} onClick={() => {
                     modals.openConfirmModal({
                        title: "Confirmar eliminación",
                        children: <Text size="sm">¿Estás seguro? Esta acción ocultará el elemento y todas las evidencias fotográficas asociadas. No se podrá deshacer desde esta pantalla.</Text>,
                        labels: { confirm: "Eliminar", cancel: "Cancelar" },
                        confirmProps: { color: 'red' },
                        onConfirm: () => onEliminar(reporte.id)
                     });
                 }}>
                    Eliminar Reporte
                 </Menu.Item>
              </Menu.Dropdown>
           </Menu>
        </Group>
      </Group>

      <Title order={4} mt="sm" pr="lg">
        {reporte.areaNombre || 'Área no especificada'}
      </Title>

      <Text size="sm" c="dimmed" mt="xs">
        Zona: {reporte.zonaNombre || 'No especificada'}
      </Text>
      <Text size="sm" c="dimmed" mb="md">
        Revisor: {reporte.revisorNombre || 'No asignado'}
      </Text>

      <Group justify="flex-end" mt="md" grow>
        <Button variant="light" color="blue" onClick={handleEdit}>
          Editar Circuitos
        </Button>
        <Button variant="light" color="indigo" leftSection={<IconDownload size={18} />} onClick={() => navigate(`/reportes/${reporte.id}/exportar`)}>
          Exportar
        </Button>
      </Group>
    </Card>
  );
}
