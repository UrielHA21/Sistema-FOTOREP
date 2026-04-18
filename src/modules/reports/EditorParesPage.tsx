import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Title, Box, Group, Button, Center, Loader, SimpleGrid, Paper, Text, Badge, Slider } from '@mantine/core';
import { IconChevronLeft, IconDownload, IconPlus, IconPlug } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../core/firebase';
import { useParesFotograficos } from './hooks/useParesFotograficos';
import PairCard from './components/PairCard';

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';

export default function EditorParesPage() {
  const { reporteId, circuitoId } = useParams();
  const navigate = useNavigate();
  const [circuito, setCircuito] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const [zoomLevel, setZoomLevel] = useState(1);

  const { pares, loadingList, isZipping, crearParVacio, actualizarMitadPar, eliminarPar, intercambiarFotos, reordenarPares, descargarZip } = useParesFotograficos(reporteId, circuitoId);

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

  if (loading) return <Center h="50vh"><Loader color="blue" /></Center>;

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
        <Button variant="subtle" color="gray" leftSection={<IconChevronLeft size={16} />} onClick={() => navigate(`/reportes/${reporteId}/circuitos`)} mb="md" px={0}>
          Volver a Circuitos
        </Button>

        <Group justify="space-between" align="flex-end">
          <Box>
             <Group align="center" gap="sm">
              <IconPlug size={28} color="var(--mantine-color-blue-6)" />
              <Title order={2}>{circuito?.nombre || 'Circuito FLM-XXX'}</Title>
            </Group>
            <Group mt="md" gap="xl">
              <Badge color="gray" variant="light" size="lg">Pares: {pares.length}</Badge>
              <Box w={150}>
                 <Text size="xs" c="dimmed" mb={5}>ZOOM FOTOGRÁFICO</Text>
                 <Slider min={1} max={3} step={1} value={zoomLevel} onChange={setZoomLevel} marks={[{value:1, label:'1'}, {value:2, label:'2'}, {value:3, label:'3'}]} label={null} color="gray" size="sm" />
              </Box>
            </Group>
          </Box>

          <Group>
            <Button variant="default" leftSection={<IconDownload size={16} />} onClick={() => descargarZip(circuito?.nombre)} loading={isZipping} disabled={pares.length === 0}>
              Descargar ZIP
            </Button>
            <Button color="green" leftSection={<IconPlus size={16} />} onClick={() => navigate(`/reportes/${reporteId}/circuitos/${circuitoId}/carga-masiva`)}>
              Agregar Fotos Masivo
            </Button>
            <Button variant="light" onClick={handleCrearPar} loading={isCreating}>
              Agregar Par
            </Button>
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
