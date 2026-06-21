import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Title, Text, Group, Button, Box, Table, Alert, Center, Loader, Modal, TextInput, Badge, ActionIcon, Select, List } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconChevronLeft, IconPlus, IconInfoCircle, IconPhotoPlus, IconEdit, IconTrash, IconEye, IconCircleCheck, IconMapPin } from '@tabler/icons-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../core/firebase';
import EmptyState from '../../shared/ui/EmptyState';
import { useCircuitos } from './hooks/useCircuitos';
import { useAccessibilityStore } from '../accessibility/store';
import { useMediaQuery } from '@mantine/hooks';
import { Tooltip } from '@mantine/core';
import {
  getCircuitoColor, getCircuitoLabel,
  getReporteColor, getReporteLabel,
  marcarReporteEnRevision, marcarReporteCompletado,
  actualizarEstadoCircuito,
} from './hooks/useEstadoWorkflow';

export default function CircuitosPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [reporte, setReporte] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const { circuitos, loading: circuitosLoading, agregarCircuito, eliminarCircuito } = useCircuitos(id);

  const { simpleMode } = useAccessibilityStore();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const showText = !isMobile && !simpleMode;

  // Estados del Modal de Nuevo Circuito
  const [modalOpened, setModalOpened] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Estados del Modal de Edición de Circuito
  const [editingCircuito, setEditingCircuito] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editEstado, setEditEstado] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editErrors, setEditErrors] = useState<string[]>([]);

  // Botones de estado del reporte
  const [isMarkingRevision, setIsMarkingRevision] = useState(false);
  const [isMarkingCompletado, setIsMarkingCompletado] = useState(false);

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
    setEditErrors([]);

    // Validar si el nuevo estado requiere tener pares
    const circActual = circuitos.find(c => c.id === editingCircuito.id);
    const totalPares = circActual?.totalPares || 0;
    const validation = await actualizarEstadoCircuito(editEstado, totalPares);

    if (!validation.valid) {
      setEditErrors([validation.message || 'Estado inválido.']);
      return;
    }

    setIsSavingEdit(true);
    try {
       await updateDoc(doc(db, 'reportes', id, 'circuitos', editingCircuito.id), {
          nombre: editName.trim(),
          estado: editEstado || 'pendiente'
       });
       notifications.show({
         title: 'Circuito actualizado',
         message: `Estado cambiado a "${getCircuitoLabel(editEstado)}".`,
         color: 'blue',
       });
       setEditingCircuito(null);
    } catch(e) {
       console.error("Error renombrando:", e);
    } finally {
       setIsSavingEdit(false);
    }
  };

  // ─── Marcar Reporte como "En Revisión" ────────────────────────────────────
  const handleMarcarRevision = async () => {
    if (!id) return;
    setIsMarkingRevision(true);
    try {
      const result = await marcarReporteEnRevision(id);
      if (!result.valid) {
        modals.open({
          title: 'No se puede marcar como "En Revisión"',
          children: (
            <Box>
              <Text size="sm" mb="sm">{result.message}</Text>
              {result.details && (
                <List size="sm" withPadding>
                  {result.details.map((d, i) => <List.Item key={i}>{d}</List.Item>)}
                </List>
              )}
            </Box>
          ),
        });
      } else {
        setReporte((prev: any) => ({ ...prev, estado: 'en_revision' }));
        notifications.show({
          title: 'Reporte en Revisión',
          message: 'El reporte se marcó como "En Revisión". Ya puedes exportar el ZIP y previsualizar.',
          color: 'violet',
        });
      }
    } catch (e) {
      console.error(e);
      notifications.show({ title: 'Error', message: 'No se pudo actualizar el estado del reporte.', color: 'red' });
    } finally {
      setIsMarkingRevision(false);
    }
  };

  // ─── Marcar Reporte como "Completado" ─────────────────────────────────────
  const handleMarcarCompletado = async () => {
    if (!id) return;
    modals.openConfirmModal({
      title: 'Marcar Reporte como Completado',
      children: (
        <Text size="sm">
          Esta acción habilitará la generación del PDF final. Todos los circuitos deben estar en "Realizado". ¿Confirmas?
        </Text>
      ),
      labels: { confirm: 'Sí, marcar Completado', cancel: 'Cancelar' },
      confirmProps: { color: 'green' },
      onConfirm: async () => {
        setIsMarkingCompletado(true);
        try {
          const result = await marcarReporteCompletado(id);
          if (!result.valid) {
            modals.open({
              title: 'No se puede marcar como "Completado"',
              children: (
                <Box>
                  <Text size="sm" mb="sm">{result.message}</Text>
                  {result.details && (
                    <List size="sm" withPadding>
                      {result.details.map((d, i) => <List.Item key={i}>{d}</List.Item>)}
                    </List>
                  )}
                </Box>
              ),
            });
          } else {
            setReporte((prev: any) => ({ ...prev, estado: 'completado' }));
            notifications.show({
              title: '¡Reporte Completado!',
              message: 'El PDF ya puede generarse desde la página de Exportación.',
              color: 'green',
            });
          }
        } catch (e) {
          console.error(e);
          notifications.show({ title: 'Error', message: 'No se pudo completar el reporte.', color: 'red' });
        } finally {
          setIsMarkingCompletado(false);
        }
      },
    });
  };

  if (loading) {
    return <Center h="50vh"><Loader color="blue" /></Center>;
  }

  const estadoReporte = reporte?.estado || 'borrador';

  const actionButton = (
    <Button 
      color="blue" 
      onClick={() => setModalOpened(true)}
      title={!showText ? "Agregar Circuito" : undefined}
      aria-label="Agregar Circuito"
      leftSection={showText ? <IconPlus size={16} /> : undefined}
      px={showText ? undefined : 'xs'}
    >
      {showText ? "Agregar Circuito" : <IconPlus size={16} />}
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
        >
          Volver al Dashboard
        </Button>

        <Group justify="space-between" align="flex-start">
          <Box>
            <Group gap="sm" mb={4}>
              <Group gap="xs">
                <IconMapPin size={24} color="var(--mantine-color-blue-6)" />
                <Title order={2}>{reporte?.areaNombre || 'Área Desconocida'}</Title>
              </Group>
              {/* Badge estado del Reporte */}
              <Badge color={getReporteColor(estadoReporte)} variant="filled" size="lg">
                {getReporteLabel(estadoReporte)}
              </Badge>
            </Group>
            <Text c="dimmed" mt={4}>Revisor: {reporte?.revisorNombre || 'No Asignado'}</Text>
          </Box>

          {/* Botones de workflow del reporte */}
          <Group gap="xs" display={{ base: 'none', sm: 'flex' }}>
            {estadoReporte === 'borrador' && (
              <Tooltip label="Todos los circuitos deben estar en 'En Progreso' o 'Realizado'" withArrow>
                <Button
                  color="violet"
                  variant="light"
                  onClick={handleMarcarRevision}
                  loading={isMarkingRevision}
                  aria-label="Marcar reporte en revisión"
                  title="Marcar reporte en revisión"
                  leftSection={showText ? <IconEye size={16} /> : undefined}
                  px={showText ? undefined : 'xs'}
                >
                  {showText ? "Marcar en Revisión" : <IconEye size={16} />}
                </Button>
              </Tooltip>
            )}
            {estadoReporte === 'en_revision' && (
              <Tooltip label="Todos los circuitos deben estar en 'Realizado'" withArrow>
                <Button
                  color="green"
                  variant="light"
                  onClick={handleMarcarCompletado}
                  loading={isMarkingCompletado}
                  aria-label="Marcar reporte como completado"
                  title="Marcar reporte como completado"
                  leftSection={showText ? <IconCircleCheck size={16} /> : undefined}
                  px={showText ? undefined : 'xs'}
                >
                  {showText ? "Marcar Completado" : <IconCircleCheck size={16} />}
                </Button>
              </Tooltip>
            )}
            {estadoReporte === 'completado' && (
              <Badge color="green" variant="filled" size="lg">✓ Exportación PDF habilitada</Badge>
            )}
            <Box display={{ base: 'none', sm: 'block' }}>
              {actionButton}
            </Box>
          </Group>
        </Group>
      </Box>

      {/* Botones móviles */}
      <Group display={{ base: 'flex', sm: 'none' }} mb="md" gap="xs">
        {estadoReporte === 'borrador' && (
          <Button
            color="violet"
            variant="light"
            size="sm"
            onClick={handleMarcarRevision}
            loading={isMarkingRevision}
            leftSection={showText ? <IconEye size={16} /> : undefined}
            px={showText ? undefined : 'xs'}
          >
            {showText ? "Marcar en Revisión" : <IconEye size={16} />}
          </Button>
        )}
        {estadoReporte === 'en_revision' && (
          <Button
            color="green"
            variant="light"
            size="sm"
            onClick={handleMarcarCompletado}
            loading={isMarkingCompletado}
            leftSection={showText ? <IconCircleCheck size={16} /> : undefined}
            px={showText ? undefined : 'xs'}
          >
            {showText ? "Marcar Completado" : <IconCircleCheck size={16} />}
          </Button>
        )}
        {actionButton}
      </Group>

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
                   <Badge color={getCircuitoColor(c.estado)} variant="light">
                     {getCircuitoLabel(c.estado)}
                   </Badge>
                 </Table.Td>
                 <Table.Td>{c.nombre}</Table.Td>
                 <Table.Td>{c.totalPares || 0}</Table.Td>
                 <Table.Td>
                   <Group gap="sm" wrap="nowrap">
                     {showText ? (
                       <>
                         <Button size="xs" variant="light" color="blue" leftSection={<IconEdit size={14} />} onClick={() => navigate(`/reportes/${id}/circuitos/${c.id}/pares`)}>
                           Editor
                         </Button>
                         <Button size="xs" variant="light" color="green" leftSection={<IconPhotoPlus size={14} />} onClick={() => navigate(`/reportes/${id}/circuitos/${c.id}/carga-masiva`)}>
                           Fotos Masiva
                         </Button>
                         <Button size="xs" variant="subtle" color="blue" leftSection={<IconEdit size={14} />} onClick={() => {
                            setEditingCircuito(c);
                            setEditName(c.nombre);
                            setEditEstado(c.estado || 'pendiente');
                            setEditErrors([]);
                         }}>
                           Modificar
                         </Button>
                         <Button size="xs" variant="subtle" color="red" leftSection={<IconTrash size={14} />} onClick={() => {
                            modals.openConfirmModal({
                               title: "Confirmar eliminación",
                               children: <Text size="sm">¿Estás seguro? Esta acción ocultará el elemento y todas las evidencias fotográficas asociadas. No se podrá deshacer desde esta pantalla.</Text>,
                               labels: { confirm: "Eliminar", cancel: "Cancelar" },
                               confirmProps: { color: 'red' },
                               onConfirm: () => eliminarCircuito(c.id)
                            });
                         }}>
                           Eliminar
                         </Button>
                       </>
                     ) : (
                       <>
                         <Tooltip label="Editor">
                            <ActionIcon variant="light" color="blue" size="md" onClick={() => navigate(`/reportes/${id}/circuitos/${c.id}/pares`)} aria-label="Editor de pares fotográficos" title="Editor de pares fotográficos">
                              <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Carga Masiva">
                            <ActionIcon variant="light" color="green" size="md" onClick={() => navigate(`/reportes/${id}/circuitos/${c.id}/carga-masiva`)} aria-label="Carga masiva de imágenes" title="Carga masiva de imágenes">
                               <IconPhotoPlus size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Modificar Información">
                            <ActionIcon variant="subtle" color="blue" size="md" onClick={() => {
                               setEditingCircuito(c);
                               setEditName(c.nombre);
                               setEditEstado(c.estado || 'pendiente');
                               setEditErrors([]);
                            }} aria-label="Modificar información del circuito" title="Modificar información del circuito">
                               <IconEdit size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Eliminar Circuito">
                            <ActionIcon variant="subtle" color="red" size="md" onClick={() => {
                               modals.openConfirmModal({
                                  title: "Confirmar eliminación",
                                  children: <Text size="sm">¿Estás seguro? Esta acción ocultará el elemento y todas las evidencias fotográficas asociadas. No se podrá deshacer desde esta pantalla.</Text>,
                                  labels: { confirm: "Eliminar", cancel: "Cancelar" },
                                  confirmProps: { color: 'red' },
                                  onConfirm: () => eliminarCircuito(c.id)
                               });
                            }} aria-label="Eliminar circuito" title="Eliminar circuito">
                              <IconTrash size={16} />
                           </ActionIcon>
                         </Tooltip>
                       </>
                     )}
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
        Los circuitos deben estar en "Realizado" para poder marcar el reporte como "Completado" y habilitar la generación del PDF.
      </Alert>

      {/* Modal Agregar Nuevo */}
      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Nuevo Circuito">
        <TextInput label="Nombre del Circuito" placeholder="Ej: Recámara Principal" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.currentTarget.value)} data-autofocus mb="md" />
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setModalOpened(false)} disabled={isSaving}>Cancelar</Button>
          <Button color="blue" onClick={handleCrearCircuito} loading={isSaving}>Crear</Button>
        </Group>
      </Modal>

      {/* Modal Editar Circuito */}
      <Modal opened={!!editingCircuito} onClose={() => { if(!isSavingEdit) { setEditingCircuito(null); setEditErrors([]); } }} title="Editar Información del Circuito" shadow="sm">
        <TextInput label="Nombre del Circuito" value={editName} onChange={(e) => setEditName(e.currentTarget.value)} data-autofocus mb="md" />
        <Select
          label="Estado del Circuito"
          data={[
            { value: 'pendiente',   label: 'Pendiente' },
            { value: 'en_progreso', label: 'En Progreso' },
            { value: 'realizado',   label: 'Realizado' },
          ]}
          value={editEstado}
          onChange={(v) => { setEditEstado(v || 'pendiente'); setEditErrors([]); }}
          mb="md"
        />
        {editErrors.length > 0 && (
          <Alert color="orange" title="No se puede guardar" mb="md" variant="light">
            {editErrors.map((e, i) => <Text key={i} size="sm">{e}</Text>)}
          </Alert>
        )}
        <Group justify="flex-end">
          <Button variant="default" onClick={() => { setEditingCircuito(null); setEditErrors([]); }} disabled={isSavingEdit}>Cancelar</Button>
          <Button color="blue" onClick={handleEditSave} loading={isSavingEdit}>Guardar Cambios</Button>
        </Group>
      </Modal>

    </Container>
  );
}
