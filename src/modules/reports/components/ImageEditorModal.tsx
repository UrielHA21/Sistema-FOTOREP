import { useState, useRef, useEffect } from 'react';
import { Modal, Group, Button, Box, Text, ActionIcon, Slider, Badge, Stack, Tooltip } from '@mantine/core';
import { IconRotateClockwise, IconFlipHorizontal, IconArrowBackUp, IconFocusCentered, IconCheck } from '@tabler/icons-react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageEditorModalProps {
  opened: boolean;
  onClose: () => void;
  imageUrl: string | null;
  onSave: (file: File) => Promise<void>;
}

export default function ImageEditorModal({ opened, onClose, imageUrl, onSave }: ImageEditorModalProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const [rotation, setRotation] = useState(0);
  const [scale, setScale] = useState(1);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (opened) {
      handleUndo();
    }
  }, [opened]);

  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleMirror = () => setIsFlipped((prev) => !prev);

  const handleUndo = () => {
    setRotation(0);
    setScale(1);
    setIsFlipped(false);
    if (imgRef.current) {
      handleFocus(imgRef.current);
    } else {
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
  };

  const handleFocus = (imageNode?: HTMLImageElement) => {
    const targetNode = imageNode || imgRef.current;
    if (!targetNode) return;
    const { width, height } = targetNode;

    // Genera un centro matemático 4:3 al 90% de la imagen
    const newCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 4 / 3, width, height),
      width,
      height
    );
    setCrop(newCrop);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    handleFocus(e.currentTarget);
  };

  const handleSave = async () => {
    if (!imgRef.current) return;
    setIsSaving(true);
    try {
      const image = imgRef.current;
      const tCrop = completedCrop || {
        x: 0, y: 0, width: image.width, height: image.height, unit: 'px'
      };

      if (!tCrop.width || !tCrop.height) {
        throw new Error('Selección de corte vacía.');
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context not available');

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const pixelRatio = window.devicePixelRatio;

      canvas.width = Math.floor(tCrop.width * scaleX * pixelRatio);
      canvas.height = Math.floor(tCrop.height * scaleY * pixelRatio);

      ctx.scale(pixelRatio, pixelRatio);
      ctx.imageSmoothingQuality = 'high';

      const cropX = tCrop.x * scaleX;
      const cropY = tCrop.y * scaleY;
      const rotateRads = rotation * (Math.PI / 180);
      const centerX = image.naturalWidth / 2;
      const centerY = image.naturalHeight / 2;

      ctx.save();
      ctx.translate(-cropX, -cropY);
      ctx.translate(centerX, centerY);
      ctx.rotate(rotateRads);
      ctx.scale(isFlipped ? -1 : 1, 1);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);

      ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);
      ctx.restore();

      const blob = await new Promise<Blob | null>((resolve, reject) => {
        try {
          canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95);
        } catch (err) {
          reject(err);
        }
      });

      if (!blob) throw new Error('Fallo la compresión Blob');

      const randomHash = Math.random().toString(36).substring(7);
      const file = new File([blob], `edit_${randomHash}.jpg`, { type: 'image/jpeg' });
      await onSave(file);
      setIsSaving(false);
    } catch (e) {
      console.error(e);
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (isSaving) return;
    onClose();
  };

  const currentTransform = [
    `rotate(${rotation}deg)`,
    `scaleX(${isFlipped ? -1 : 1})`,
    `scale(${scale})`
  ].join(' ');

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      size="100%"
      withCloseButton={false}
      padding={0}
      styles={{
        content: { height: '100vh', display: 'flex', flexDirection: 'column' }
      }}
    >
      <Box px="xl" py="sm" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
        <Group justify="space-between" align="center">
          <Text c="dimmed" size="sm" fw={600} style={{ letterSpacing: 1 }}>EDITOR DE IMAGEN — DETALLE</Text>
          <Group>
            <Button variant="subtle" color="red" leftSection={<IconArrowBackUp size={16} />} onClick={handleUndo} disabled={isSaving}>
              Deshacer
            </Button>
            <Button variant="default" onClick={handleClose} disabled={isSaving}>Cancelar</Button>
            <Button color="blue" onClick={handleSave} loading={isSaving} leftSection={<IconCheck size={16} />}>Guardar Cambios</Button>
          </Group>
        </Group>
      </Box>

      <Box
        flex={1}
        style={{
          position: 'relative',
          overflow: 'hidden',
          backgroundImage: 'linear-gradient(45deg, var(--mantine-color-gray-1) 25%, transparent 25%), linear-gradient(-45deg, var(--mantine-color-gray-1) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--mantine-color-gray-1) 75%), linear-gradient(-45deg, transparent 75%, var(--mantine-color-gray-1) 75%)',
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        {imageUrl && (
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={4 / 3}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              crossOrigin="anonymous" // Soluciona el error SecurityError de Blob
              alt="Objeto de Inspección"
              style={{
                transform: currentTransform,
                maxHeight: '70vh',
                maxWidth: '100vw',
                objectFit: 'contain'
              }}
              onLoad={handleImageLoad}
            />
          </ReactCrop>
        )}

        {completedCrop && completedCrop.width > 0 && (
          <Badge
            size="sm"
            variant="filled"
            color="dark"
            style={{ position: 'absolute', top: 20, left: 20, opacity: 0.8 }}
          >
            Área: {Math.round(completedCrop.width)} x {Math.round(completedCrop.height)} px
          </Badge>
        )}
      </Box>

      <Box px="xl" py="md" bg="white" style={{ borderTop: '1px solid var(--mantine-color-gray-2)' }}>
        <Group justify="space-between" align="center">

          <Box w={180}></Box>

          <Group gap="xs">
            <Tooltip label="Foco Central (Auto 4:3)" withArrow>
              <ActionIcon size="xl" variant="light" color="blue" onClick={() => handleFocus()}>
                <IconFocusCentered />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Rotar +90º" withArrow>
              <ActionIcon size="xl" variant="default" onClick={handleRotate}>
                <IconRotateClockwise />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Espejo Horizontal" withArrow>
              <ActionIcon size="xl" variant="default" onClick={handleMirror}>
                <IconFlipHorizontal />
              </ActionIcon>
            </Tooltip>
          </Group>

          <Group align="center" gap="md" w={220} justify="flex-end">
            <Stack gap={4} w="100%">
              <Text size="xs" c="dimmed" ta="right">Zoom: {Math.round(scale * 100)}%</Text>
              <Group gap="xs" wrap="nowrap">
                <ActionIcon size="sm" variant="default" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>-</ActionIcon>
                <Slider flex={1} min={0.5} max={3} step={0.1} value={scale} onChange={setScale} label={null} color="gray" size="sm" />
                <ActionIcon size="sm" variant="default" onClick={() => setScale(s => Math.min(3, s + 0.1))}>+</ActionIcon>
              </Group>
            </Stack>
          </Group>

        </Group>
        <Text c="dimmed" size="xs" ta="center" mt="sm">
          Mantén pulsada la esquina para arrastrar libremente • Shift para forzar proporción
        </Text>
      </Box>
    </Modal>
  );
}
