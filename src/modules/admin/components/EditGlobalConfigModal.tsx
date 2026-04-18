import { useState, useEffect } from 'react';
import { Modal, TextInput, Stack, Button, Group, Loader, Center, Text, Divider } from '@mantine/core';
import { IconSettings } from '@tabler/icons-react';
import { useGlobalConfig } from '../hooks/useGlobalConfig';

interface EditGlobalConfigModalProps {
  opened: boolean;
  onClose: () => void;
}

export default function EditGlobalConfigModal({ opened, onClose }: EditGlobalConfigModalProps) {
  const { config, loading, updateGlobalConfig } = useGlobalConfig();
  const [nombre, setNombre] = useState('');
  const [cargo, setCargo] = useState('');
  const [saving, setSaving] = useState(false);

  // Sincronizar formulario cuando se abra el modal o carguen los datos
  useEffect(() => {
    if (config) {
      setNombre(config.realizadoPor_nombre || '');
      setCargo(config.realizadoPor_cargo || '');
    }
  }, [config, opened]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateGlobalConfig({
        realizadoPor_nombre: nombre.trim(),
        realizadoPor_cargo: cargo.trim(),
      });
      onClose();
    } catch (e) {
      console.error('Error al guardar configuración global:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconSettings size={18} />
          <Text fw={700}>Configuración Global de Firma</Text>
        </Group>
      }
      size="md"
    >
      {loading ? (
        <Center py="xl"><Loader size="sm" /></Center>
      ) : (
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Estos datos aparecerán en la sección <b>REALIZA</b> del pie de página en todos los reportes PDF generados.
          </Text>

          <Divider />

          <TextInput
            label="Nombre Completo del Firmante"
            placeholder="Ej. Ing. Juan Pérez López"
            value={nombre}
            onChange={(e) => setNombre(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Cargo / Puesto"
            placeholder="Ej. Técnico de Infraestructura"
            value={cargo}
            onChange={(e) => setCargo(e.currentTarget.value)}
            required
          />

          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} loading={saving} disabled={!nombre || !cargo}>
              Guardar Configuración
            </Button>
          </Group>
        </Stack>
      )}
    </Modal>
  );
}
