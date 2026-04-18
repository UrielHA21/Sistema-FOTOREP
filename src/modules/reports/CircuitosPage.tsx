import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Title, Text, Group, Button, Box, Table, Alert, Center, Loader, Modal, TextInput, Badge, ActionIcon, Select } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconChevronLeft, IconPlus, IconInfoCircle, IconPhotoPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../core/firebase';
import EmptyState from '../../shared/ui/EmptyState';
import { useCircuitos } from './hooks/useCircuitos';

export default function CircuitosPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reporte, setReporte] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const { circuitos, loading: circuitosLoading, agregarCircuito, eliminarCircuito } = useCircuitos(id);

  // Estados del Modal
  const [modalOpened, setModalOpened] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Estados Edición de Nombre Circuito
  const [editingCircuito, setEditingCircuito] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editEstado, setEditEstado] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    const fetchReporte = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'reportes', id);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setReporte(snapshot.data());
        } else {
          console.error("Reporte no encontrado");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchReporte();
  }, [id]);

  const handleCrearCircuito = async () => {
    if (!nuevoNombre.trim()) return;
    setIsSaving(true);
    try {
      await agregarCircuito(nuevoNombre.trim());
      setNuevoNombre('');
      setModalOpened(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editingCircuito || !editName.trim() || !id) return;
    setIsSavingEdit(true);
    try {
       await updateDoc(doc(db, 'reportes', id, 'circuitos', editingCircuito.id), {
          nombre: editName.trim(),
          estado: editEstado || 'pendiente'
       });
       setEditingCircuito(null);
    } catch(e) {
       console.error("Error renombrando:", e);
    } finally {
       setIsSavingEdit(false);
    }
  };

  if (loading) {
    return <Center h="50vh"><Loader color="blue" /></Center>;
  }

  const actionButton = (
    <Button leftSection={<IconPlus size={16} />} color="blue" onClick={() => setModalOpened(true)}>
      Agregar Circuito
    </Button>
  );

  return (
    <Container size="xl" py="xl">
      <Box
        pos="sticky"
        top={60}
        bg="var(--mantine-color-body)"
        pb="md"
        pt="md"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)', zIndex: 190 }}
      >
        <Button 
          variant="subtle" 
          color="gray" 
          leftSection={<IconChevronLeft size={16} />} 
          onClick={() => navigate('/')}
          mb="xl"
          px={0}
        >
          Volver al Dashboard
        </Button>

        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={2}>{reporte?.areaNombre || 'Área Desconocida'}</Title>
            <Text c="dimmed" mt={4}>Revisor: {reporte?.revisorNombre || 'No Asignado'}</Text>
          </Box>
          <Box display={{ base: 'none', sm: 'block' }}>
            {actionButton}
          </Box>
        </Group>
      </Box>

      {/* Visibilidad principal en móvil si se oculta en header */}
      <Box display={{ base: 'block', sm: 'none' }} mb="md">
         {actionButton}
      </Box>

      {circuitosLoading ? (
        <Center py="xl"><Loader type="dots" /></Center>
      ) : circuitos.length === 0 ? (
        <EmptyState 
          title="No hay circuitos creados" 
          description="Agrega el primer circuito para comenzar a cargar evidencias."
          action={actionButton}
        />
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Estado</Table.Th>
              <Table.Th>Nombre del Circuito</Table.Th>
              <Table.Th>Número de Pares</Table.Th>
              <Table.Th>Acciones</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
             {circuitos.map(c => (
               <Table.Tr key={c.id}>
                 <Table.Td>
                   <Badge color={c.estado === 'completado' ? 'green' : c.estado === 'en progreso' ? 'blue' : 'gray'} variant="light">
                     {c.estado ? c.estado.toUpperCase() : 'PENDIENTE'}
                   </Badge>
                 </Table.Td>
                 <Table.Td>{c.nombre}</Table.Td>
                 <Table.Td>{c.totalPares || 0}</Table.Td>
                 <Table.Td>
                   <Group gap="sm" wrap="nowrap">
                     <Button size="xs" variant="light" onClick={() => navigate(`/reportes/${id}/circuitos/${c.id}/pares`)}>Abrir Editor</Button>
                     <ActionIcon variant="light" color="green" size="md" title="Carga Masiva" onClick={() => navigate(`/reportes/${id}/circuitos/${c.id}/carga-masiva`)}>
                        <IconPhotoPlus size={16} />
                     </ActionIcon>
                     <ActionIcon variant="subtle" color="blue" size="md" title="Editar Información" onClick={() => {
                        setEditingCircuito(c);
                        setEditName(c.nombre);
                        setEditEstado(c.estado || 'pendiente');
                     }}>
                        <IconEdit size={16} />
                     </ActionIcon>
                     <ActionIcon variant="subtle" color="red" size="md" title="Eliminar Circuito" onClick={() => {
                        modals.openConfirmModal({
                           title: "Confirmar eliminación",
                           children: <Text size="sm">¿Estás seguro? Esta acción ocultará el elemento y todas las evidencias fotográficas asociadas. No se podrá deshacer desde esta pantalla.</Text>,
                           labels: { confirm: "Eliminar", cancel: "Cancelar" },
                           confirmProps: { color: 'red' },
                           onConfirm: () => eliminarCircuito(c.id)
                        });
                     }}>
                        <IconTrash size={16} />
                     </ActionIcon>
                   </Group>
                 </Table.Td>
               </Table.Tr>
             ))}
          </Table.Tbody>
        </Table>
      )}

      <Alert 
        variant="light" 
        color="blue" 
        title="Información" 
        icon={<IconInfoCircle />} 
        mt={40}
      >
        Utilice el Editor de Imágenes para cargar y organizar las fotografías de cada circuito una vez creado.
      </Alert>

      {/* Modal Agregar Nuevo */}
      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Nuevo Circuito">
        <TextInput label="Nombre del Circuito" placeholder="Ej: Recámara Principal" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.currentTarget.value)} data-autofocus mb="md" />
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setModalOpened(false)} disabled={isSaving}>Cancelar</Button>
          <Button color="blue" onClick={handleCrearCircuito} loading={isSaving}>Crear</Button>
        </Group>
      </Modal>

      {/* Modal Editar Nombre */}
      <Modal opened={!!editingCircuito} onClose={() => { if(!isSavingEdit) setEditingCircuito(null) }} title="Editar Información del Circuito" shadow="sm">
        <TextInput label="Nombre del Circuito" value={editName} onChange={(e) => setEditName(e.currentTarget.value)} data-autofocus mb="md" />
        <Select label="Estado del Circuito" data={['pendiente', 'en progreso', 'completado']} value={editEstado} onChange={(v) => setEditEstado(v || 'pendiente')} mb="xl" />
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setEditingCircuito(null)} disabled={isSavingEdit}>Cancelar</Button>
          <Button color="blue" onClick={handleEditSave} loading={isSavingEdit}>Guardar Cambios</Button>
        </Group>
      </Modal>

    </Container>
  );
}
