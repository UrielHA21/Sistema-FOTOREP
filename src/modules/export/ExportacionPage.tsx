import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Grid, Title, Text, Tabs, Paper, Table, Checkbox, Radio, Button, Box, Loader, Center, Group, NumberInput, Progress } from '@mantine/core';
import { IconFileTypePdf, IconFileZip, IconChevronLeft } from '@tabler/icons-react';
import { collection, getDocs, query, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../../core/firebase';
import { useZipExport } from './hooks/useZipExport';

interface CircuitoResumen {
   id: string;
   nombre: string;
   totalPares: number;
}

function useExportDashboardData(reporteId: string | undefined) {
   const [loading, setLoading] = useState(true);
   const [reporteMeta, setReporteMeta] = useState<any>(null);
   const [circuitos, setCircuitos] = useState<CircuitoResumen[]>([]);

   useEffect(() => {
      const fetchData = async () => {
         if (!reporteId) return;
         try {
            const rSnap = await getDoc(doc(db, 'reportes', reporteId));
            if (rSnap.exists()) setReporteMeta(rSnap.data());

            const cQuery = query(collection(db, 'reportes', reporteId, 'circuitos'), orderBy('fechaCreacion', 'asc'));
            const cSnap = await getDocs(cQuery);

            const circs: CircuitoResumen[] = [];
            cSnap.forEach((d) => {
               const data = d.data();
               if (!data.eliminado) {
                  circs.push({
                     id: d.id,
                     nombre: data.nombre || 'Desconocido',
                     totalPares: data.totalPares || 0
                  });
               }
            });
            setCircuitos(circs);
         } catch (e) {
            console.error(e);
         } finally {
            setLoading(false);
         }
      };
      fetchData();
   }, [reporteId]);

   return { loading, reporteMeta, circuitos };
}

export default function ExportacionPage() {
   const { reporteId } = useParams();
   const navigate = useNavigate();
   const { loading, reporteMeta, circuitos } = useExportDashboardData(reporteId);

   const [activeTab, setActiveTab] = useState<string | null>('pdf');
   const [selectedCircuits, setSelectedCircuits] = useState<string[]>([]);
   const [exportQuantities, setExportQuantities] = useState<Record<string, number>>({});
   const [paresPorHoja, setParesPorHoja] = useState('3');

   const { isExporting, progress, downloadCircuitZip } = useZipExport();
   const circuitosNombres = circuitos.reduce((acc, c) => ({ ...acc, [c.id]: c.nombre }), {} as Record<string, string>);

   useEffect(() => {
      if (circuitos.length > 0) {
         const initial: Record<string, number> = {};
         circuitos.forEach(c => initial[c.id] = c.totalPares);
         setExportQuantities(initial);
      }
   }, [circuitos]);

   const allSelected = circuitos.length > 0 && selectedCircuits.length === circuitos.length;
   const someSelected = selectedCircuits.length > 0 && selectedCircuits.length < circuitos.length;

   const handleSelectAll = (checked: boolean) => {
      if (checked) {
         setSelectedCircuits(circuitos.map(c => c.id));
      } else {
         setSelectedCircuits([]);
      }
   };

   const toggleCircuito = (id: string) => {
      setSelectedCircuits(prev => prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]);
   };

   if (loading) return <Center h="50vh"><Loader color="blue" /></Center>;

   const circuitosSeleccionados = circuitos.filter(c => selectedCircuits.includes(c.id));
   const totalParesAExportar = circuitosSeleccionados.reduce((sum, c) => sum + (exportQuantities[c.id] || 0), 0);

   const estimatedPages = Math.ceil(totalParesAExportar / parseInt(paresPorHoja));
   const archivosExtraidos = totalParesAExportar * 2;
   const megabytesEstimados = (archivosExtraidos * 0.5).toFixed(1);

   return (
      <Container size="xl" py="xl">
         <Button variant="subtle" color="gray" leftSection={<IconChevronLeft size={16} />} onClick={() => navigate('/')} mb="md" px={0}>
            Volver al Dashboard
         </Button>

         <Title order={1} mb={4}>Exportación de Datos</Title>
         <Text c="dimmed" mb="xl">Configura y genera los entregables a partir de los circuitos seleccionados.</Text>

         <Grid>
            <Grid.Col span={{ base: 12, md: 8 }}>
               <Tabs value={activeTab} onChange={setActiveTab} mb="md">
                  <Tabs.List>
                     <Tabs.Tab value="pdf" leftSection={<IconFileTypePdf size={16} />}>Exportar PDF</Tabs.Tab>
                     <Tabs.Tab value="zip" leftSection={<IconFileZip size={16} />}>Exportar ZIP</Tabs.Tab>
                  </Tabs.List>
               </Tabs>

               <Paper withBorder p="md" radius="md">
                  <Group justify="space-between" mb="xs">
                     <Text fw={700} size="sm">INVENTARIO DE CIRCUITOS</Text>
                     <Text size="sm" c="dimmed">{selectedCircuits.length} circuitos seleccionados</Text>
                  </Group>
                  <Table verticalSpacing="sm" striped>
                     <Table.Thead>
                        <Table.Tr>
                           <Table.Th w={40}>
                              <Checkbox
                                 checked={allSelected}
                                 indeterminate={someSelected}
                                 onChange={(e) => handleSelectAll(e.currentTarget.checked)}
                              />
                           </Table.Th>
                           <Table.Th>Nombre del Circuito</Table.Th>
                           <Table.Th ta="center">Pares Totales</Table.Th>
                           <Table.Th ta="center">Cantidad a Exportar</Table.Th>
                        </Table.Tr>
                     </Table.Thead>
                     <Table.Tbody>
                        {circuitos.map(circuito => (
                           <Table.Tr key={circuito.id}>
                              <Table.Td>
                                 <Checkbox
                                    checked={selectedCircuits.includes(circuito.id)}
                                    onChange={() => toggleCircuito(circuito.id)}
                                 />
                              </Table.Td>
                              <Table.Td><Text size="sm" fw={500}>{circuito.nombre}</Text></Table.Td>
                              <Table.Td ta="center"><Text size="sm">{circuito.totalPares}</Text></Table.Td>
                              <Table.Td ta="center">
                                 <NumberInput
                                    value={exportQuantities[circuito.id] || 0}
                                    onChange={(val) => setExportQuantities(p => ({ ...p, [circuito.id]: Number(val) }))}
                                    min={1}
                                    max={circuito.totalPares}
                                    disabled={!selectedCircuits.includes(circuito.id)}
                                    w={90}
                                    mx="auto"
                                    hideControls={false}
                                 />
                              </Table.Td>
                           </Table.Tr>
                        ))}
                        {circuitos.length === 0 && (
                           <Table.Tr>
                              <Table.Td colSpan={4} ta="center"><Text c="dimmed">No hay circuitos disponibles</Text></Table.Td>
                           </Table.Tr>
                        )}
                     </Table.Tbody>
                  </Table>
               </Paper>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
               <Paper withBorder p="xl" radius="md" shadow="sm" pos="sticky" top={80}>
                  {activeTab === 'pdf' ? (
                     <>
                        <Text fw={700} mb="lg" c="dark.8">CONFIGURACIÓN DE PÁGINA</Text>

                        <Radio.Group
                           value={paresPorHoja}
                           onChange={(val) => setParesPorHoja(val)}
                           label="PARES POR HOJA"
                           mb="xl"
                        >
                           <Group mt="xs" align="flex-start" style={{ flexDirection: 'column' }}>
                              <Radio value="1" label="1 (uno) par por hoja" />
                              <Radio value="3" label="3 (tres) pares por hoja" />
                           </Group>
                        </Radio.Group>

                        <Box bg="blue.0" p="md" mb="xl" style={{ border: '1px solid var(--mantine-color-blue-2)', borderRadius: 8 }}>
                           <Text size="xs" fw={700} c="blue.8" mb={4}>ESTIMACIÓN FINAL</Text>
                           <Group align="flex-end" gap="xs">
                              <Text style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }} c="blue.6">
                                 {estimatedPages}
                              </Text>
                              <Text size="sm" c="blue.9" fw={600} pb={4}>Hojas</Text>
                           </Group>
                        </Box>

                        <Button fullWidth size="md" onClick={() => {
                           navigate(`/reportes/${reporteId}/exportar/pdf`, {
                              state: { selectedCircuits, exportQuantities, paresPorHoja }
                           });
                        }} disabled={selectedCircuits.length === 0}>
                           Generar Reporte PDF →
                        </Button>
                     </>
                  ) : (
                     <>
                        <Text fw={700} mb="lg" c="dark.8">DESCARGAR ARCHIVO ZIP</Text>

                        <Box mb="xl">
                           <Text size="xs" fw={700} c="dimmed" mb={4}>ESTADÍSTICAS</Text>
                           <Grid>
                              <Grid.Col span={6}>
                                 <Text size="xs" c="dimmed">ARCHIVOS TOTALES</Text>
                                 <Text fw={600}>{archivosExtraidos}</Text>
                              </Grid.Col>
                              <Grid.Col span={6}>
                                 <Text size="xs" c="dimmed">TAMAÑO ESTIMADO</Text>
                                 <Text fw={600}>{megabytesEstimados} MB</Text>
                              </Grid.Col>
                              <Grid.Col span={12} mt="xs">
                                 <Text size="xs" c="dimmed">FORMATO DE SALIDA</Text>
                                 <Text fw={600}>.ZIP / High-Res</Text>
                              </Grid.Col>
                           </Grid>
                        </Box>

                        <Box bg="teal.0" p="md" mb="xl" style={{ border: '1px solid var(--mantine-color-teal-2)', borderRadius: 8 }}>
                           <Text size="xs" fw={700} c="teal.8" mb={4}>ESTADO DE PREPARACIÓN</Text>
                           <Group align="flex-end" gap="xs">
                              <Text style={{ fontSize: 36, fontWeight: 800, lineHeight: 1 }} c="teal.6">
                                 {archivosExtraidos}
                              </Text>
                              <Text size="sm" c="teal.9" fw={600} pb={4}>Archivos Listos</Text>
                           </Group>
                        </Box>

                        <Button color="teal" fullWidth size="md" onClick={() => downloadCircuitZip(reporteId || '', reporteMeta?.areaNombre || reporteId || '', selectedCircuits, exportQuantities, circuitosNombres)} loading={isExporting} disabled={selectedCircuits.length === 0}>
                           Descargar Imágenes (.zip)
                        </Button>

                        {isExporting && (
                           <Box mt="md">
                              <Text size="xs" ta="center" mb={2} fw={600} c="teal">Procesando y empaquetando {progress}%</Text>
                              <Progress value={progress} color="teal" striped animated size="sm" />
                           </Box>
                        )}
                     </>
                  )}
               </Paper>
            </Grid.Col>
         </Grid>
      </Container>
   );
}
