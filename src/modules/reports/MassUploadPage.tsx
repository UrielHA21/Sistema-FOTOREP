import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Title, Box, Group, Button, Center, Loader, SimpleGrid, Paper, Text, ActionIcon, Image, Affix, Card, Alert, SegmentedControl } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE, type FileWithPath } from '@mantine/dropzone';
import { IconChevronLeft, IconHistory, IconCheck, IconTrash, IconPlayerPlay, IconInfoCircle, IconArrowUp, IconX } from '@tabler/icons-react';
import { useParesFotograficos } from './hooks/useParesFotograficos';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../core/firebase';

export default function MassUploadPage() {
  const { reporteId, circuitoId } = useParams();
  const navigate = useNavigate();

  const [circuito, setCircuito] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [filesAntes, setFilesAntes] = useState<FileWithPath[]>([]);
  const [filesDespues, setFilesDespues] = useState<FileWithPath[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(true);
  const [compressionLevel, setCompressionLevel] = useState('light');

  const { subirLoteMasivo } = useParesFotograficos(reporteId, circuitoId);

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

  const removeFileAntes = (index: number) => setFilesAntes(prev => prev.filter((_, i) => i !== index));
  const removeFileDespues = (index: number) => setFilesDespues(prev => prev.filter((_, i) => i !== index));
  
  const removePair = (index: number) => {
      removeFileAntes(index);
      removeFileDespues(index);
  };

  const handleProcessMass = async () => {
      setIsProcessing(true);
      try {
         await subirLoteMasivo(filesAntes, filesDespues, (current, total) => {
             setProgressText(`Optimizando y Subiendo ${current} de ${total}...`);
         }, compressionLevel as any);
         navigate(`/reportes/${reporteId}/circuitos/${circuitoId}/pares`);
      } catch(e) {
         console.error(e);
         setIsProcessing(false);
         setProgressText(null);
      }
  };

  const total = Math.max(filesAntes.length, filesDespues.length);
  const arrayRange = Array.from({ length: total }, (_, i) => i);

  if (loading) return <Center h="50vh"><Loader color="blue" /></Center>;

  return (
    <Container size="lg" py="xl">
      <Box pos="sticky" top={60} bg="var(--mantine-color-body)" pb="sm" pt="md" style={{ borderBottom: '1px solid var(--mantine-color-default-border)', zIndex: 100 }}>
        <Button variant="subtle" color="gray" leftSection={<IconChevronLeft size={16} />} onClick={() => navigate(`/reportes/${reporteId}/circuitos/${circuitoId}/pares`)} mb="xs" px={0}>
          Volver al Editor de Pares
        </Button>
        <Group justify="space-between" align="flex-start" mb="sm">
           <Box>
              <Title order={3} mb="xs">{circuito?.nombre || 'Circuito'} — Carga Masiva</Title>
              <Box>
                 <Text size="sm" fw={500} mb={4}>Calidad de Evidencia</Text>
                 <SegmentedControl
                    value={compressionLevel}
                    onChange={(val) => setCompressionLevel(val)}
                    data={[
                       { label: 'Original', value: 'original' },
                       { label: 'Ligera (Recomendado)', value: 'light' },
                       { label: 'Máxima (Para Correo)', value: 'max' },
                    ]}
                 />
              </Box>
           </Box>
           
           <Group mt="md">
             <Text c="dimmed" size="sm" display={{ base: 'none', sm: 'block' }}>Listos: <b>{total}</b> pares</Text>
             <Button color="green" size="sm" leftSection={<IconPlayerPlay size={16} />} loading={isProcessing} disabled={total === 0} onClick={handleProcessMass}>
               {isProcessing ? (progressText || 'Procesando Motor CFE...') : 'Aprobar Carga'}
             </Button>
           </Group>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Paper withBorder p={4} radius="md">
            <Dropzone 
               disabled={isProcessing} 
               onDrop={(f) => setFilesAntes(p => [...p, ...f])} 
               accept={IMAGE_MIME_TYPE} 
               style={{ borderStyle: 'dashed', borderWidth: 2 }} 
               bg="gray.0"
               radius="sm"
            >
                <Center h={45} style={{ pointerEvents: 'none' }}>
                  <Dropzone.Accept>
                    <Group gap="xs">
                      <IconArrowUp size={20} color="var(--mantine-color-blue-6)" />
                      <Text fw={600} size="sm" c="blue.6">Suelta imágenes aquí</Text>
                    </Group>
                  </Dropzone.Accept>
                  <Dropzone.Reject>
                    <Group gap="xs">
                      <IconX size={20} color="var(--mantine-color-red-6)" />
                      <Text fw={600} size="sm" c="red.6">Tipo no soportado</Text>
                    </Group>
                  </Dropzone.Reject>
                  <Dropzone.Idle>
                    <Group gap="xs">
                      <IconHistory size={20} color="var(--mantine-color-blue-6)" />
                      <Box>
                          <Text fw={600} size="sm">Múltiples: ANTES</Text>
                      </Box>
                    </Group>
                  </Dropzone.Idle>
                </Center>
            </Dropzone>
          </Paper>

          <Paper withBorder p={4} radius="md">
            <Dropzone 
               disabled={isProcessing} 
               onDrop={(f) => setFilesDespues(p => [...p, ...f])} 
               accept={IMAGE_MIME_TYPE} 
               style={{ borderStyle: 'dashed', borderWidth: 2 }} 
               bg="gray.0"
               radius="sm"
            >
                <Center h={45} style={{ pointerEvents: 'none' }}>
                  <Dropzone.Accept>
                    <Group gap="xs">
                      <IconArrowUp size={20} color="var(--mantine-color-green-6)" />
                      <Text fw={600} size="sm" c="green.6">Suelta imágenes aquí</Text>
                    </Group>
                  </Dropzone.Accept>
                  <Dropzone.Reject>
                    <Group gap="xs">
                      <IconX size={20} color="var(--mantine-color-red-6)" />
                      <Text fw={600} size="sm" c="red.6">Tipo no soportado</Text>
                    </Group>
                  </Dropzone.Reject>
                  <Dropzone.Idle>
                    <Group gap="xs">
                      <IconCheck size={20} color="var(--mantine-color-green-6)" />
                      <Box>
                          <Text fw={600} size="sm">Múltiples: DESPUÉS</Text>
                      </Box>
                    </Group>
                  </Dropzone.Idle>
                </Center>
            </Dropzone>
          </Paper>
        </SimpleGrid>
      </Box>

      <Box bg="var(--mantine-color-gray-0)" mt="0" p="xl" style={{ minHeight: '60vh', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }}>
        {total > 0 && (
           <Box>
             {showAlert && (
                <Alert title="Sugerencia de Sincronización" color="blue" withCloseButton onClose={() => setShowAlert(false)} mb="lg" icon={<IconInfoCircle size={16}/>}>
                   Si las imágenes presentan un desfase debido a un error de subida (exceso/omisión), utiliza la flechita roja para purgar esa imagen concreta y forzar a las contiguas a desplazar hacia arriba reconciliando el emparejamiento; o utiliza la "X" en la esquina de la tarjeta para descartar el par completo.
                </Alert>
             )}
             
             <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
                 {arrayRange.map((idx) => {
                    const fileA = filesAntes[idx];
                    const fileB = filesDespues[idx];
                    return (
                      <Card key={idx} shadow="sm" radius="md" withBorder padding="sm" style={{ position: 'relative' }}>
                         <ActionIcon 
                             color="red" 
                             variant="filled" 
                             size="sm" 
                             radius="xl" 
                             style={{ position: 'absolute', top: 8, right: 8, zIndex: 10 }} 
                             onClick={() => removePair(idx)}
                             title="Descartar este par por completo"
                         >
                            <IconTrash size={12} />
                         </ActionIcon>
                         
                         <Text c="dimmed" size="xs" fw={700} ta="center" mb="xs" style={{ letterSpacing: 1 }}>NUEVO PAR #{idx + 1}</Text>
                         
                         <SimpleGrid cols={2} spacing="xs">
                            <Box>
                               {fileA ? (
                                  <Box pos="relative">
                                     <Image src={URL.createObjectURL(fileA)} height={100} radius="sm" fit="cover" />
                                     <ActionIcon color="red" variant="default" size="xs" style={{ position: 'absolute', bottom: 4, right: 4 }} onClick={() => removeFileAntes(idx)} title="Purgar imagen aisaladamente y desplazar panel hacia arriba">
                                        <IconArrowUp size={12} color="red" />
                                     </ActionIcon>
                                  </Box>
                               ) : (
                                  <Center h={100} bg="gray.1" style={{ border: '1px dashed var(--mantine-color-gray-4)', borderRadius: 4 }}>
                                     <Text size="xs" c="dimmed" ta="center">ANTES<br/>Vacío</Text>
                                  </Center>
                               )}
                            </Box>

                            <Box>
                               {fileB ? (
                                  <Box pos="relative">
                                     <Image src={URL.createObjectURL(fileB)} height={100} radius="sm" fit="cover" />
                                     <ActionIcon color="red" variant="default" size="xs" style={{ position: 'absolute', bottom: 4, right: 4 }} onClick={() => removeFileDespues(idx)} title="Purgar imagen aisaladamente y desplazar panel hacia arriba">
                                        <IconArrowUp size={12} color="red" />
                                     </ActionIcon>
                                  </Box>
                               ) : (
                                  <Center h={100} bg="gray.1" style={{ border: '1px dashed var(--mantine-color-gray-4)', borderRadius: 4 }}>
                                     <Text size="xs" c="dimmed" ta="center">DESPUÉS<br/>Vacío</Text>
                                  </Center>
                               )}
                            </Box>
                         </SimpleGrid>
                      </Card>
                    );
                 })}
             </SimpleGrid>
           </Box>
        )}
      </Box>

      <Affix position={{ bottom: 20, right: 20 }} zIndex={200}>
        <Card shadow="lg" radius="md" bg="dark.8" c="white" p="xs" style={{ maxWidth: 350, opacity: 0.9 }}>
           <Group wrap="nowrap" align="flex-start" gap="sm">
              <IconInfoCircle size={20} color="var(--mantine-color-blue-4)" style={{marginTop: 2}} />
              <Text size="xs" lh={1.4}>
                <b>REQUERIMIENTOS CFE:</b> Asegúrese de que las fotos de ANTES y DESPUÉS garanticen el mismo ángulo y encuadre para una comparativa válida en el reporte de evidencia final.
              </Text>
           </Group>
        </Card>
      </Affix>
    </Container>
  );
}
