import { useState } from 'react';
import { Card, SimpleGrid, Box, Text, Image, ActionIcon, Stack, Loader, Flex, Button, Overlay, AspectRatio } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE, type FileWithPath } from '@mantine/dropzone';
import { IconArrowsExchange, IconX, IconGripVertical, IconEdit } from '@tabler/icons-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ParFotografico } from '../hooks/useParesFotograficos';
import ImageEditorModal from './ImageEditorModal';

interface PairCardProps {
  par: ParFotografico;
  onUpdateHalf: (parId: string, lado: 'antes' | 'despues', file: File) => Promise<void>;
  onDelete?: (parId: string) => void;
  onSwap?: (parId: string, urlAntes: string | null, urlDespues: string | null) => void;
}

export default function PairCard({ par, onUpdateHalf, onDelete, onSwap }: PairCardProps) {
  const [loadingAntes, setLoadingAntes] = useState(false);
  const [loadingDespues, setLoadingDespues] = useState(false);

  const [editorTarget, setEditorTarget] = useState<'antes' | 'despues' | null>(null);
  const [hoveredSide, setHoveredSide] = useState<'antes' | 'despues' | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: par.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 100 : undefined,
    position: isDragging ? 'relative' as const : undefined,
  };

  const handleDrop = async (files: FileWithPath[], lado: 'antes' | 'despues') => {
    if (files.length === 0) return;
    if (lado === 'antes') setLoadingAntes(true);
    if (lado === 'despues') setLoadingDespues(true);
    try {
      await onUpdateHalf(par.id, lado, files[0]);
    } catch (e) {
      console.error(e);
    } finally {
      if (lado === 'antes') setLoadingAntes(false);
      if (lado === 'despues') setLoadingDespues(false);
    }
  };

  const handleSaveEditor = async (file: File) => {
     if (!editorTarget) return;
     const lado = editorTarget;
     
     try {
       await onUpdateHalf(par.id, lado, file);
       setEditorTarget(null); // Solo cerramos si tuvo exito el update a Firebase
     } catch (e) {
       console.error("Editor guardado fallido: ", e);
       throw e; // Lanzamos de vuelta para que ImageEditorModal se entere y quite IS_SAVING = true
     }
  };

  const renderLado = (lado: 'antes' | 'despues') => {
    const url = lado === 'antes' ? par.urlAntes : par.urlDespues;
    const isLoading = lado === 'antes' ? loadingAntes : loadingDespues;

    if (isLoading) {
       return (
         <AspectRatio ratio={4 / 3}>
           <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--mantine-color-gray-0)', border: '2px dashed var(--mantine-color-gray-4)' }}>
              <Loader color="blue" />
           </Box>
         </AspectRatio>
       );
    }

    if (url) {
      return (
        <AspectRatio ratio={4 / 3}>
          <Box 
            bg="black" 
            style={{ position: 'relative' }}
            onMouseEnter={() => setHoveredSide(lado)}
            onMouseLeave={() => setHoveredSide(null)}
          >
            <Image src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            
            {hoveredSide === lado && (
               <Overlay color="#000" backgroundOpacity={0.6} zIndex={10} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Button 
                     variant="white" 
                     color="dark"
                     leftSection={<IconEdit size={16}/>}
                     onClick={() => setEditorTarget(lado)}
                  >
                     Editar imagen
                  </Button>
               </Overlay>
            )}
          </Box>
        </AspectRatio>
      );
    }

    return (
      <AspectRatio ratio={4 / 3}>
        <Dropzone onDrop={(files) => handleDrop(files, lado)} accept={IMAGE_MIME_TYPE} maxFiles={1} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', borderStyle: 'dashed', borderWidth: 2, backgroundColor: 'var(--mantine-color-gray-0)' }} radius={0}>
          <Text c="dimmed" size="sm" ta="center">Arrastra o haz clic<br/>para subir</Text>
        </Dropzone>
      </AspectRatio>
    );
  };

  const getEditorUrl = () => {
     if (editorTarget === 'antes') return par.urlAntes || null;
     if (editorTarget === 'despues') return par.urlDespues || null;
     return null;
  };

  return (
    <>
      <Card ref={setNodeRef} style={style} shadow="sm" radius="md" withBorder padding={0}>
        <Flex h="100%">
          <Box w={35} bg="gray.1" style={{ borderRight: '1px solid var(--mantine-color-gray-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: isDragging ? 'grabbing' : 'grab' }} {...attributes} {...listeners}>
            <IconGripVertical size={20} color="var(--mantine-color-gray-5)" />
          </Box>

          <Box flex={1}>
            <Box py={8} bg="gray.0" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
              <Text c="dimmed" size="xs" fw={700} ta="center" style={{ letterSpacing: 1 }}>PAR DE INSPECCIÓN #{par.orden}</Text>
            </Box>
            <SimpleGrid cols={2} spacing={0}>
              <Box style={{ borderRight: '1px solid var(--mantine-color-gray-2)' }}>
                {renderLado('antes')}
                <Box bg="gray.1" py={8}><Text fw={700} size="xs" ta="center">ANTES</Text></Box>
              </Box>
              <Box>
                {renderLado('despues')}
                <Box bg="gray.1" py={8}><Text fw={700} size="xs" ta="center">DESPUÉS</Text></Box>
              </Box>
            </SimpleGrid>
          </Box>

          <Box w={50} bg="white" style={{ borderLeft: '1px solid var(--mantine-color-gray-2)' }}>
             <Stack h="100%" justify="center" align="center" gap="md">
               <ActionIcon variant="light" color="blue" size="lg" radius="xl" onClick={() => onSwap && onSwap(par.id, par.urlAntes, par.urlDespues)}>
                 <IconArrowsExchange size={20} stroke={2} />
               </ActionIcon>
               <ActionIcon variant="light" color="red" size="lg" radius="xl" onClick={() => onDelete && onDelete(par.id)}>
                 <IconX size={20} stroke={2} />
               </ActionIcon>
             </Stack>
          </Box>
        </Flex>
      </Card>

      <ImageEditorModal 
         opened={!!editorTarget} 
         onClose={() => setEditorTarget(null)}
         imageUrl={getEditorUrl()}
         onSave={handleSaveEditor}
      />
    </>
  );
}
