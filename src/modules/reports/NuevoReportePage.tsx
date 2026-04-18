import { useState, useEffect } from 'react';
import { Container, Title, Stepper, Group, Button, Select, TextInput, SimpleGrid, Paper, Text, Box, Alert } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { catalogosService } from '../admin/catalogos.service';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../core/firebase';

const mockTiposFormato = ['A', 'B'];

export default function NuevoReportePage() {
  const [activeStep, setActiveStep] = useState(0);
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  // Estado local para los Datos Generales (Paso 1)
  const [formData, setFormData] = useState({
    zonaId: '',
    areaId: '',
    tipoFormato: '',
    numeroEstimacion: '',
  });

  const [zonas, setZonas] = useState<{value: string, label: string}[]>([]);
  const [areas, setAreas] = useState<{value: string, label: string}[]>([]);
  const [revisorAsignado, setRevisorAsignado] = useState('');

  const [loadingZonas, setLoadingZonas] = useState(true);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingRevisores, setLoadingRevisores] = useState(false);

  // 1. Cargar Zonas inicialmente
  useEffect(() => {
    catalogosService.getCollection('zonas').then(res => {
       setZonas(res.map(z => ({ value: z.id, label: z.nombre })));
    }).finally(() => {
       setLoadingZonas(false);
    });
  }, []);

  // 2. Cargar Áreas dependientes de la Zona
  useEffect(() => {
    if (formData.zonaId) {
      setLoadingAreas(true);
      setFormData(prev => ({...prev, areaId: ''}));
      setAreas([]);

      catalogosService.getCollection('areas', { zonaId: formData.zonaId }).then(res => {
         setAreas(res.map(a => ({ value: a.id, label: a.nombre })));
      }).finally(() => {
         setLoadingAreas(false);
      });
    } else {
      setAreas([]);
      setFormData(prev => ({...prev, areaId: ''}));
    }
  }, [formData.zonaId]);

  // 3. Cargar Revisores dependientes del Área
  useEffect(() => {
    if (formData.areaId) {
      setLoadingRevisores(true);
      setRevisorAsignado('');

      catalogosService.getCollection('personal_revisor', { areaId: formData.areaId }).then(res => {
         setRevisorAsignado(res.length > 0 ? res[0].nombre : 'Sin asignar');
      }).finally(() => {
         setLoadingRevisores(false);
      });
    } else {
      setRevisorAsignado('');
    }
  }, [formData.areaId]);


  const handleNext = () => {
    setActiveStep((current) => (current < 2 ? current + 1 : current));
  };

  const handleBack = () => {
    setActiveStep((current) => (current > 0 ? current - 1 : current));
  };

  const handleCancel = () => {
    navigate('/');
  };

  const handleCrearReporte = async () => {
    setIsSaving(true);
    try {
      const zonaLabel = zonas.find(z => z.value === formData.zonaId)?.label || '';
      const areaLabel = areas.find(a => a.value === formData.areaId)?.label || '';
      const revisorLabel = revisorAsignado || 'Sin asignar';

      const docRef = await addDoc(collection(db, 'reportes'), {
        zonaId: formData.zonaId,
        areaId: formData.areaId,
        zonaNombre: zonaLabel,
        areaNombre: areaLabel,
        revisorNombre: revisorLabel,
        tipoFormato: formData.tipoFormato,
        numeroEstimacion: formData.numeroEstimacion,
        estado: 'borrador',
        totalPares: 0,
        fechaCreacion: serverTimestamp()
      });
      
      // Auto-redirección tras creación exitosa
      navigate(`/reportes/${docRef.id}/circuitos`);
    } catch (e) {
      console.error("Error al crear reporte:", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="xl">
        Crear Nuevo Reporte
      </Title>

      <Stepper active={activeStep} onStepClick={setActiveStep} mb="xl">
        <Stepper.Step label="Datos Generales" description="Información base">
          <Paper withBorder p="md" radius="md">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              <Select
                label="Zona"
                placeholder={loadingZonas ? "Cargando..." : "Seleccione la zona"}
                data={zonas}
                value={formData.zonaId}
                onChange={(value) => setFormData({ ...formData, zonaId: value || '' })}
                disabled={loadingZonas}
                required
              />
              <Select
                label="Área"
                placeholder={loadingAreas ? "Cargando..." : "Seleccione el área"}
                data={areas}
                value={formData.areaId}
                onChange={(value) => setFormData({ ...formData, areaId: value || '' })}
                disabled={!formData.zonaId || loadingAreas}
                required
              />
              <Box>
                <Text size="sm" fw={500} mb={3}>Revisor de Área</Text>
                {formData.areaId ? (
                   <Alert color="blue" py="xs" variant="light">
                      {loadingRevisores ? 'Cargando revisor...' : (revisorAsignado || 'No se encontró revisor asociado a esta área.')}
                   </Alert>
                ) : (
                   <Alert color="gray" py="xs" variant="light">
                      Seleccione un área para ver el revisor asignado.
                   </Alert>
                )}
              </Box>
              <Select
                label="Tipo de formato"
                placeholder="Seleccione el formato"
                data={mockTiposFormato}
                value={formData.tipoFormato}
                onChange={(value) => setFormData({ ...formData, tipoFormato: value || '' })}
                required
              />
              <TextInput
                label="Número de estimación"
                placeholder="Ej. 1(UNO) ÚNICA"
                value={formData.numeroEstimacion}
                onChange={(e) => setFormData({ ...formData, numeroEstimacion: e.currentTarget.value })}
                required
              />
            </SimpleGrid>
          </Paper>
        </Stepper.Step>

        <Stepper.Step label="Revisión Final" description="Confirma y guarda">
          <Paper withBorder p="xl" radius="md">
            <Title order={4} mb="md">Resumen del Reporte</Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <Box>
                <Text size="sm" c="dimmed">Zona seleccionada</Text>
                <Text fw={500}>{zonas.find(z => z.value === formData.zonaId)?.label || '-'}</Text>
              </Box>
              <Box>
                <Text size="sm" c="dimmed">Área operativa</Text>
                <Text fw={500}>{areas.find(a => a.value === formData.areaId)?.label || '-'}</Text>
              </Box>
              <Box>
                <Text size="sm" c="dimmed">Revisado por (Automatizado)</Text>
                <Text fw={500}>{revisorAsignado || '-'}</Text>
              </Box>
              <Box>
                <Text size="sm" c="dimmed">Número de estimación y Formato</Text>
                <Text fw={500}>{formData.numeroEstimacion || '-'} (Tipo {formData.tipoFormato || '-'})</Text>
              </Box>
            </SimpleGrid>
          </Paper>
        </Stepper.Step>

        <Stepper.Completed>
          <Paper withBorder p="xl" radius="md" ta="center">
            Procesando...
          </Paper>
        </Stepper.Completed>
      </Stepper>

      <Group justify="space-between" mt="xl">
        <Button variant="default" onClick={activeStep === 0 ? handleCancel : handleBack} disabled={isSaving}>
          {activeStep === 0 ? 'Cancelar' : 'Atrás'}
        </Button>
        {activeStep === 0 && (
          <Button onClick={handleNext}>
            Siguiente
          </Button>
        )}
        {activeStep === 1 && (
          <Button color="blue" onClick={handleCrearReporte} loading={isSaving}>
            Crear Reporte
          </Button>
        )}
      </Group>
    </Container>
  );
}
