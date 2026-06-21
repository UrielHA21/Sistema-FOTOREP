import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Title, Box, Group, Button, Center, Loader, SimpleGrid, Paper, Text, Badge, Slider } from '@mantine/core';
import { IconChevronLeft, IconCheck, IconPlus, IconTree } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../core/firebase';
import { useParesFotograficos } from './hooks/useParesFotograficos';
import PairCard from './components/PairCard';
import { useAccessibilityStore } from '../accessibility/store';
import { useMediaQuery } from '@mantine/hooks';
import { Tooltip } from '@mantine/core';
import { marcarCircuitoRealizado } from './hooks/useEstadoWorkflow';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';

export default function EditorParesPage() {
  const { reporteId, circuitoId } = useParams();
  const navigate = useNavigate();
  const [circuito, setCircuito] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isMarkingRealizado, setIsMarkingRealizado] = useState(false);

  const [zoomLevel, setZoomLevel] = useState(1);
  const { simpleMode } = useAccessibilityStore();
  const isMobile = useMediaQuery('(max-width: 48em)');
  const showText = !isMobile && !simpleMode;

  const { pares, loadingList, crearParVacio, actualizarMitadPar, eliminarPar, intercambiarFotos, reordenarPares } = useParesFotograficos(reporteId, circuitoId);

  // Local state for immediate drag feedback
  const [activeItems, setActiveItems] = useState(pares);

  useEffect(() => {
    setActiveItems(pares);
  }, [pares]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const fetchCircuito = async () => {
      if (!reporteId || !circuitoId) return;
      try {
        const snap = await getDoc(doc(db, 'reportes', reporteId, 'circuitos', circuitoId));
        if (snap.exists()) setCircuito(snap.data());
      } catch (e) {
        console.error("Error cargando circuito:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchCircuito();
  }, [reporteId, circuitoId]);

  const handleCrearPar = async () => {
    setIsCreating(true);
    await crearParVacio();
    setIsCreating(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = activeItems.findIndex((i) => i.id === active.id);
      const newIndex = activeItems.findIndex((i) => i.id === over?.id);
      
      const newOrder = arrayMove(activeItems, oldIndex, newIndex);
      setActiveItems(newOrder); 
      // Background Sync
      await reordenarPares(newOrder); 
    }
  };

  const confirmarEliminacion = (parId: string) => {
    modals.openConfirmModal({
      title: 'Eliminar Par Fotográfico',
      children: <Text size="sm">¿Estás seguro de que deseas eliminar este par? Esta acción no se puede deshacer.</Text>,
      labels: { confirm: 'Eliminar', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: () => eliminarPar(parId),
    });
  };

  const handleMarcarRealizado = async () => {
    if (!reporteId || !circuitoId) return;

    modals.openConfirmModal({
      title: 'Marcar Circuito como Realizado',
      children: (
        <Text size="sm">
          ¿Confirmas que todas las evidencias fotográficas de este circuito están completas y verificadas?
          Este estado indica que el circuito está listo para revisión.
        </Text>
      ),
      labels: { confirm: 'Sí, marcar como Realizado', cancel: 'Cancelar' },
      confirmProps: { color: 'teal' },
      onConfirm: async () => {
        setIsMarkingRealizado(true);
        try {
          const result = await marcarCircuitoRealizado(reporteId, circuitoId, pares.length);
          if (!result.valid) {
            notifications.show({
              title: 'No se puede marcar como Realizado',
              message: result.message,
              color: 'orange',
            });
          } else {
            // Actualizar estado local del circuito
            setCircuito((prev: any) => ({ ...prev, estado: 'realizado' }));
            // Actualizar campo en_progreso si era pendiente
            await updateDoc(doc(db, 'reportes', reporteId, 'circuitos', circuitoId), {
              estado: 'realizado',
            });
            notifications.show({
              title: 'Circuito marcado como Realizado',
              message: '¡Excelente! El circuito está listo para revisión.',
              color: 'teal',
            });
          }
        } catch (e) {
          console.error(e);
          notifications.show({ title: 'Error', message: 'Ocurrió un error al actualizar el estado.', color: 'red' });
        } finally {
          setIsMarkingRealizado(false);
        }
      },
    });
  };

  if (loading) return <Center h="50vh"><Loader color="blue" /></Center>;

  const estadoActual = circuito?.estado || 'pendiente';
  const yaRealizado = estadoActual === 'realizado';

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
        <Button variant="subtle" color="gray" leftSection={<IconChevronLeft size={16} />} onClick={() => navigate(`/reportes/${reporteId}/circuitos`)} mb="md">
          Volver a Circuitos
        </Button>

        <Group justify="space-between" align="center" style={{ flexWrap: 'wrap', gap: 16 }}>
          <Group gap="xl" align="center">
             <Group align="center" gap="sm">
              <IconTree size={28} color="var(--mantine-color-blue-6)" />
              <Title order={2} size={isMobile ? "h3" : "h2"}>{circuito?.nombre || 'Circuito FLM-XXX'}</Title>
            </Group>
            <Group gap="xl" align="center" display={{ base: 'none', sm: 'flex' }}>
              <Badge color="gray" variant="light" size="lg">Pares: {pares.length}</Badge>
              {/* Badge de estado del circuito */}
              <Badge
                color={estadoActual === 'realizado' ? 'teal' : estadoActual === 'en_progreso' ? 'blue' : 'gray'}
                variant="filled"
                size="lg"
              >
                {estadoActual === 'realizado' ? 'Realizado' : estadoActual === 'en_progreso' ? 'En Progreso' : 'Pendiente'}
              </Badge>
              <Box w={150}>
                 <Text size="xs" c="dimmed" mb={5}>ZOOM FOTOGRÁFICO</Text>
                 <Slider min={1} max={3} step={1} value={zoomLevel} onChange={setZoomLevel} marks={[{value:1, label:'1'}, {value:2, label:'2'}, {value:3, label:'3'}]} label={null} color="gray" size="sm" />
              </Box>
            </Group>
          </Group>

          <Group w={{ base: '100%', sm: 'auto' }} justify="flex-end">
            {/* Botón "Marcar como Realizado" */}
            <Tooltip label={yaRealizado ? "Circuito ya marcado como Realizado" : "Marcar circuito como Realizado"} disabled={showText}>
              <Button
                color={yaRealizado ? "teal" : "violet"}
                variant={yaRealizado ? "light" : "filled"}
                onClick={handleMarcarRealizado}
                loading={isMarkingRealizado}
                disabled={yaRealizado || pares.length === 0}
                leftSection={showText ? <IconCheck size={16} /> : undefined}
                px={showText ? undefined : 'xs'}
                title={yaRealizado ? "Circuito ya marcado como Realizado" : "Marcar circuito como Realizado"}
                aria-label={yaRealizado ? "Circuito ya marcado como Realizado" : "Marcar circuito como Realizado"}
              >
                {showText ? (yaRealizado ? "Realizado ✓" : "Marcar como Realizado") : <IconCheck size={16} />}
              </Button>
            </Tooltip>
            
            <Tooltip label="Agregar Fotos Masivo" disabled={showText}>
              <Button 
                color="green" 
                onClick={() => navigate(`/reportes/${reporteId}/circuitos/${circuitoId}/carga-masiva`)}
                leftSection={showText ? <IconPlus size={16} /> : undefined}
                px={showText ? undefined : 'xs'}
                aria-label="Agregar fotos masivo"
                title="Agregar fotos masivo"
              >
                {showText ? "Agregar Fotos Masivo" : <IconPlus size={16} />}
              </Button>
            </Tooltip>
            
            <Tooltip label="Agregar Par" disabled={showText}>
              <Button 
                variant="light" 
                onClick={handleCrearPar} 
                loading={isCreating}
                leftSection={showText ? <IconPlus size={16} /> : undefined}
                px={showText ? undefined : 'xs'}
                aria-label="Agregar par fotográfico"
                title="Agregar par fotográfico"
              >
                {showText ? "Agregar Par" : <IconPlus size={16} />}
              </Button>
            </Tooltip>
          </Group>
        </Group>
      </Box>

      <Box bg="var(--mantine-color-gray-0)" mt="md" p={0} style={{ minHeight: '60vh' }}>
        {loadingList ? (
           <Center h={200}><Loader type="dots" /></Center>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={activeItems.map(p => p.id)} strategy={rectSortingStrategy}>
              <SimpleGrid cols={{ base: 1, md: zoomLevel === 1 ? 1 : 2, lg: zoomLevel }} spacing="xl">
                {activeItems.map((par) => (
                   <PairCard key={par.id} par={par} onUpdateHalf={actualizarMitadPar} onDelete={confirmarEliminacion} onSwap={intercambiarFotos} />
                ))}
                
                {/* Fixed Tarjeta de Nuevo Par */}
                <Box>
                  <Text c="transparent" size="xs" fw={700} mb={4}>-</Text>
                  <Paper withBorder radius="md" p="xl" style={{ borderStyle: 'dashed', borderWidth: 2, cursor: 'pointer', backgroundColor: 'transparent' }} onClick={handleCrearPar}>
                    <Center h={100}>
                      {isCreating ? <Loader color="blue" /> : (
                        <Group gap="xs" c="dimmed"><IconPlus size={24} /><Text fw={500}>Haz clic para agregar un Nuevo Par</Text></Group>
                      )}
                    </Center>
                  </Paper>
                </Box>
              </SimpleGrid>
            </SortableContext>
          </DndContext>
        )}
      </Box>
    </Container>
  );
}
