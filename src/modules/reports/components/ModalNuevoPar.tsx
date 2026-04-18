import { useState } from 'react';
import { Modal, SimpleGrid, Box, Button, Image, Text, Stack, SegmentedControl } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE, type FileWithPath } from '@mantine/dropzone';

interface ModalNuevoParProps {
  opened: boolean;
  onClose: () => void;
  onSave: (fileAntes: File, fileDespues: File, notas: string, quality: any) => Promise<void>;
  isUploading: boolean;
}

export default function ModalNuevoPar({ opened, onClose, onSave, isUploading }: ModalNuevoParProps) {
  const [fileAntes, setFileAntes] = useState<File | null>(null);
  const [fileDespues, setFileDespues] = useState<File | null>(null);
  const [compressionLevel, setCompressionLevel] = useState('light');

  const handleClose = () => {
    if (isUploading) return;
    setFileAntes(null);
    setFileDespues(null);
    onClose();
  };

  const handleSave = async () => {
    if (fileAntes && fileDespues) {
      await onSave(fileAntes, fileDespues, '', compressionLevel);
      handleClose();
    }
  };

  const PreviewImage = ({ file, label }: { file: File | null; label: string }) => {
    if (!file) return null;
    const imageUrl = URL.createObjectURL(file);
    return (
      <Stack align="center" gap="xs">
        <Text size="sm" fw={500}>{label}</Text>
        <Image src={imageUrl} h={200} fit="contain" radius="md" />
      </Stack>
    );
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Agregar Par Fotográfico Manual" size="xl" closeOnClickOutside={!isUploading}>
      <Box mb="md">
        <Text size="sm" fw={500} mb={4}>Calidad de Compresión</Text>
        <SegmentedControl
           value={compressionLevel}
           onChange={(v) => setCompressionLevel(v)}
           fullWidth
           data={[
              { label: 'Original', value: 'original' },
              { label: 'Ligera', value: 'light' },
              { label: 'Máxima', value: 'max' },
           ]}
        />
      </Box>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl" mb="md">
        <Box>
          {fileAntes ? (
            <PreviewImage file={fileAntes} label="Foco del Antes" />
          ) : (
            <Dropzone
              onDrop={(files: FileWithPath[]) => setFileAntes(files[0])}
              accept={IMAGE_MIME_TYPE}
              maxFiles={1}
              style={{ height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <Text c="dimmed" inline>Arrastra la foto del 'Antes' aquí</Text>
            </Dropzone>
          )}
        </Box>

        <Box>
          {fileDespues ? (
            <PreviewImage file={fileDespues} label="Foco del Después" />
          ) : (
            <Dropzone
              onDrop={(files: FileWithPath[]) => setFileDespues(files[0])}
              accept={IMAGE_MIME_TYPE}
              maxFiles={1}
              style={{ height: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <Text c="dimmed" inline>Arrastra la foto del 'Después' aquí</Text>
            </Dropzone>
          )}
        </Box>
      </SimpleGrid>

      <Button 
        fullWidth 
        color="blue" 
        onClick={handleSave} 
        loading={isUploading}
        disabled={!fileAntes || !fileDespues}
        mt="md"
      >
        Subir y Guardar Par
      </Button>
    </Modal>
  );
}
