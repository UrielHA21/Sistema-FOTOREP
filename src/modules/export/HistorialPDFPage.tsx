import { useState, useEffect } from 'react';
import { Title, Table, Button, Group, Text, ActionIcon, Loader, Center, Alert, Box, Paper, Flex } from '@mantine/core';
import { IconDownload, IconTrash, IconFileText, IconAlertCircle, IconArrowLeft } from '@tabler/icons-react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage, functions } from '../../core/firebase';
import { useAuthStore } from '../auth/store';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';

interface Exportacion {
  id: string;
  nombre: string;
  storagePath: string;
  fecha: any;
  area: string;
  tipo: string;
  userId: string;
}

export default function HistorialPDFPage() {
  const navigate = useNavigate();
  const { userProfile, user } = useAuthStore();
  const [exportaciones, setExportaciones] = useState<Exportacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || (!userProfile && user)) return;

    let q;
    const exportacionesRef = collection(db, 'exportaciones');

    if (userProfile?.rol === 'admin') {
      // Si es admin, puede ver todo ordenado por fecha desc
      q = query(exportacionesRef, orderBy('fecha', 'desc'));
    } else {
      // Si es colaborador, solo los suyos
      q = query(exportacionesRef, where('userId', '==', user.uid), orderBy('fecha', 'desc'));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const exportsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Exportacion[];
        setExportaciones(exportsList);
        setLoading(false);
      },
      (err) => {
        console.error('Error cargando historial de PDFs:', err);
        setError('No se pudo cargar el historial. Ciertos filtros pueden requerir índices de Firestore si es tu primera vez cargando esto.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, userProfile]);

  const handleDownload = async (exp: Exportacion) => {
    try {
      const storageRef = ref(storage, exp.storagePath);
      const downloadUrl = await getDownloadURL(storageRef);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('target', '_blank');
      link.setAttribute('download', exp.nombre);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: any) {
      notifications.show({
        title: 'Error de descarga',
        message: 'No se pudo obtener el archivo. Quizás fue eliminado o ya expiró. ' + (err?.message || ''),
        color: 'red'
      });
    }
  };

  const handleDelete = async (exp: Exportacion) => {
    if (!window.confirm(`¿Estás seguro que deseas eliminar permanentemente el reporte "${exp.nombre}"?`)) {
      return;
    }

    const notid = notifications.show({
      title: 'Eliminando...',
      message: 'Eliminando archivo físico y registro...',
      loading: true,
      autoClose: false
    });

    try {
      const eliminarCloudFn = httpsCallable<{ id: string }, { success: boolean }>(functions, 'eliminarExportacion');
      await eliminarCloudFn({ id: exp.id });

      notifications.update({
        id: notid,
        title: 'Eliminado',
        message: 'Exportación eliminada exitosamente.',
        color: 'green',
        loading: false,
        autoClose: 3000
      });
    } catch (err: any) {
      notifications.update({
        id: notid,
        title: 'Error al eliminar',
        message: err?.message || 'No se pudo completar la operación.',
        color: 'red',
        loading: false,
        autoClose: 5000
      });
    }
  };

  return (
    <Box>
      <Flex align="center" gap="md" mb="xl">
        <ActionIcon variant="light" onClick={() => navigate('/')} size="lg">
          <IconArrowLeft size={20} />
        </ActionIcon>
        <Title order={2}>Historial de PDFs Generados</Title>
      </Flex>

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" mb="xl" variant="light">
          {error}
        </Alert>
      )}

      {loading ? (
        <Center py={80}><Loader color="blue" type="dots" /></Center>
      ) : exportaciones.length === 0 ? (
        <Paper p="xl" radius="md" withBorder>
          <Center h={150}>
            <Text c="dimmed">No se encontraron exportaciones en tu historial.</Text>
          </Center>
        </Paper>
      ) : (
        <Paper radius="md" withBorder style={{ overflow: 'hidden' }}>
          <Table striped highlightOnHover verticalSpacing="md" horizontalSpacing="lg">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nombre de Archivo</Table.Th>
                <Table.Th>Área</Table.Th>
                <Table.Th>Fecha</Table.Th>
                <Table.Th>Acciones</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {exportaciones.map((exp) => (
                <Table.Tr key={exp.id}>
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <IconFileText size={20} color="red" stroke={1.5} />
                      <Text size="sm" fw={500} style={{ wordBreak: 'break-all' }}>
                        {exp.nombre}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{exp.area}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {exp.fecha ? new Date(exp.fecha.seconds * 1000).toLocaleString('es-MX') : '...'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="sm" wrap="nowrap">
                      <Button
                        variant="light"
                        size="xs"
                        leftSection={<IconDownload size={14} />}
                        onClick={() => handleDownload(exp)}
                      >
                        Descargar
                      </Button>
                      <ActionIcon 
                        variant="subtle" 
                        color="red" 
                        onClick={() => handleDelete(exp)}
                        aria-label="Eliminar"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
