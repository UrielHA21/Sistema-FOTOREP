import { useState, useEffect } from 'react';
import { Modal, Button, Select, TextInput, SimpleGrid, Group, Alert, Text, Box } from '@mantine/core';
import { catalogosService } from '../../admin/catalogos.service';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../core/firebase';
import type { Reporte } from '../hooks/useReportsList';

const mockTiposFormato = ['A', 'B'];
const opcionesEstado = ['borrador', 'en revisión', 'completado'];

interface ReportEditModalProps {
  opened: boolean;
  onClose: () => void;
  reporte: Reporte | null;
}

export default function ReportEditModal({ opened, onClose, reporte }: ReportEditModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    zonaId: '', areaId: '',
    tipoFormato: '', numeroEstimacion: '', estado: ''
  });

  const [zonas, setZonas] = useState<{value: string, label: string}[]>([]);
  const [areas, setAreas] = useState<{value: string, label: string}[]>([]);
  const [revisorAsignado, setRevisorAsignado] = useState('');

  const [loadingZonas, setLoadingZonas] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingRevisores, setLoadingRevisores] = useState(false);

  useEffect(() => {
     if (opened && reporte) {
         setFormData({
             zonaId: reporte.zonaId || '',
             areaId: reporte.areaId || '',
             tipoFormato: reporte.tipoFormato || '',
             numeroEstimacion: reporte.numeroEstimacion || '',
             estado: reporte.estado || 'borrador'
         });
         
         // Fetch Zonas ONLY when modal opens
         setLoadingZonas(true);
         catalogosService.getCollection('zonas').then(res => {
             setZonas(res.map(z => ({ value: z.id, label: z.nombre })));
         }).finally(() => setLoadingZonas(false));
     }
  }, [opened, reporte]);

  useEffect(() => {
    if (opened && formData.zonaId) {
      setLoadingAreas(true);
      catalogosService.getCollection('areas', { zonaId: formData.zonaId }).then(res => {
         setAreas(res.map(a => ({ value: a.id, label: a.nombre })));
      }).finally(() => setLoadingAreas(false));
    } else { setAreas([]); }
  }, [formData.zonaId, opened]);

  useEffect(() => {
    if (opened && formData.areaId) {
      setLoadingRevisores(true);
      setRevisorAsignado('');
      catalogosService.getCollection('personal_revisor', { areaId: formData.areaId }).then(res => {
         setRevisorAsignado(res.length > 0 ? res[0].nombre : 'Sin asignar');
      }).finally(() => setLoadingRevisores(false));
    } else { setRevisorAsignado(''); }
  }, [formData.areaId, opened]);

  const handleSave = async () => {
      if (!reporte) return;
      setIsSaving(true);
      try {
          const zonaLabel = zonas.find(z => z.value === formData.zonaId)?.label || '';
          const areaLabel = areas.find(a => a.value === formData.areaId)?.label || '';
          const revisorLabel = revisorAsignado || 'Sin asignar';

          await updateDoc(doc(db, 'reportes', reporte.id), {
              zonaId: formData.zonaId,
              areaId: formData.areaId,
              zonaNombre: zonaLabel,
              areaNombre: areaLabel,
              revisorNombre: revisorLabel,
              tipoFormato: formData.tipoFormato,
              numeroEstimacion: formData.numeroEstimacion,
              estado: formData.estado
          });
          onClose();
      } catch (e) {
          console.error("Error actualizando reporte", e);
      } finally { setIsSaving(false); }
  };

  return (
    <Modal opened={opened} onClose={() => { if(!isSaving) onClose() }} title="Editar Información del Reporte" size="lg" shadow="sm">
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Select label="Zona" placeholder={loadingZonas ? "Cargando..." : "Seleccione"} data={zonas} value={formData.zonaId} onChange={(v) => setFormData(p => ({...p, zonaId: v || '', areaId: ''}))} disabled={loadingZonas} required />
        <Select label="Área" placeholder={loadingAreas ? "Cargando..." : "Seleccione"} data={areas} value={formData.areaId} onChange={(v) => setFormData(p => ({...p, areaId: v || ''}))} disabled={!formData.zonaId || loadingAreas} required />
        <Box>
            <Text size="sm" fw={500} mb={3}>Revisor Asignado</Text>
            {formData.areaId ? (
                <Alert color="blue" py="xs" variant="light">
                   {loadingRevisores ? 'Cargando revisor...' : (revisorAsignado || 'No se encontró revisor para esta área.')}
                </Alert>
            ) : (
                <Alert color="gray" py="xs" variant="light">
                   Seleccione área para ver al revisor.
                </Alert>
            )}
        </Box>
        <TextInput label="Número de estimación" value={formData.numeroEstimacion} onChange={(e) => { const val = e.currentTarget.value; setFormData(p => ({...p, numeroEstimacion: val})); }} required />
        <Select label="Tipo de formato" placeholder="Seleccione" data={mockTiposFormato} value={formData.tipoFormato} onChange={(v) => setFormData(p => ({...p, tipoFormato: v || ''}))} required />
        <Select label="Estado del Reporte" placeholder="Seleccione estado" data={opcionesEstado} value={formData.estado} onChange={(v) => setFormData(p => ({...p, estado: v || 'borrador'}))} required />
      </SimpleGrid>

      <Group justify="flex-end" mt="xl">
        <Button variant="default" onClick={onClose} disabled={isSaving}>Cancelar</Button>
        <Button color="blue" onClick={handleSave} loading={isSaving}>Guardar Cambios</Button>
      </Group>
    </Modal>
  );
}
