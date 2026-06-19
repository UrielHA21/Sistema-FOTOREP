import { useState, useEffect, useRef } from 'react';
import { Affix, ActionIcon, Drawer, Switch, Stack, Text, Group, Tooltip, rem, Button, Box } from '@mantine/core';
import { useAccessibilityStore } from './store';
import { IconAccessible, IconContrast, IconTypography, IconLetterA, IconMinimize } from '@tabler/icons-react';

export default function AccessibilityWidget() {
  const [opened, setOpened] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isInactive, setIsInactive] = useState(false);
  
  // Draggable logic
  const [positionY, setPositionY] = useState(300); // Initial Y position
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startY: number, initialTop: number } | null>(null);

  const {
    highContrast, toggleHighContrast,
    largeText, toggleLargeText,
    dyslexicFont, toggleDyslexicFont,
    simpleMode, toggleSimpleMode
  } = useAccessibilityStore();

  // Inactivity Timer
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const resetTimer = () => {
      setIsInactive(false);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsInactive(true);
      }, 3000); // 3 seconds of inactivity
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('touchmove', resetTimer);
    window.addEventListener('scroll', resetTimer);

    resetTimer();

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('touchmove', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    setIsDragging(true);
    dragStartRef.current = {
      startY: e.clientY,
      initialTop: positionY
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    const deltaY = e.clientY - dragStartRef.current.startY;
    
    let newY = dragStartRef.current.initialTop + deltaY;
    // Bound to screen
    const maxY = window.innerHeight - 60; // 60px approx button height
    if (newY < 0) newY = 0;
    if (newY > maxY) newY = maxY;
    
    setPositionY(newY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    setIsDragging(false);
    dragStartRef.current = null;
  };

  const handleClick = () => {
    // Prevent click if we were just dragging (can be detected if delta was > 5px, but for simplicity we'll just toggle if not currently moving much)
    setOpened(true);
  };

  const currentOpacity = isInactive && !isHovered && !isDragging && !opened ? 0.3 : 1;

  return (
    <>
      <Affix position={{ top: positionY, left: 0 }} zIndex={200}>
        <Tooltip label="Opciones de Accesibilidad" position="right" disabled={isDragging}>
          <ActionIcon
            variant="filled"
            color="blue"
            size="xl"
            radius="0 8px 8px 0" // rounded only on the right
            style={{ 
              opacity: currentOpacity, 
              transition: isDragging ? 'none' : 'opacity 0.3s ease',
              touchAction: 'none', // prevent scrolling while dragging
              boxShadow: '2px 0 8px rgba(0,0,0,0.2)'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={handleClick}
            aria-label="Menú de Accesibilidad"
          >
            <IconAccessible style={{ width: rem(24), height: rem(24) }} stroke={1.5} />
          </ActionIcon>
        </Tooltip>
      </Affix>

      <Drawer
        opened={opened}
        onClose={() => setOpened(false)}
        title={
          <Group>
            <IconAccessible size={24} />
            <Text fw={600} size="lg">Accesibilidad (WCAG)</Text>
          </Group>
        }
        position="left"
        padding="md"
        size="sm"
      >
        <Stack mt="md" gap="lg">
          <Group justify="space-between">
            <Group gap="xs">
              <IconContrast size={20} />
              <Text>Alto Contraste</Text>
            </Group>
            <Switch checked={highContrast} onChange={toggleHighContrast} size="md" />
          </Group>

          <Group justify="space-between">
            <Group gap="xs">
              <IconTypography size={20} />
              <Text>Fuente Grande</Text>
            </Group>
            <Switch checked={largeText} onChange={toggleLargeText} size="md" />
          </Group>

          <Group justify="space-between">
            <Group gap="xs">
              <IconLetterA size={20} />
              <Text>Fuente para Dislexia</Text>
            </Group>
            <Switch checked={dyslexicFont} onChange={toggleDyslexicFont} size="md" />
          </Group>

          <Group justify="space-between">
            <Group gap="xs">
              <IconMinimize size={20} />
              <Box>
                <Text>Modo Minimalista</Text>
                <Text size="xs" c="dimmed">Ocultar texto en botones, mostrar solo iconos</Text>
              </Box>
            </Group>
            <Switch checked={simpleMode} onChange={toggleSimpleMode} size="md" />
          </Group>
          
          <Button variant="light" onClick={() => setOpened(false)} mt="xl">
            Cerrar
          </Button>
        </Stack>
      </Drawer>
    </>
  );
}
