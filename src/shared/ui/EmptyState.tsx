import React from 'react';
import { Stack, Text, ThemeIcon } from '@mantine/core';
import { IconFolderOpen } from '@tabler/icons-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Stack align="center" justify="center" h="100%" gap="md" py={80}>
      <ThemeIcon size={80} radius="xl" variant="light" color="gray">
        <IconFolderOpen size={40} stroke={1.5} color="var(--mantine-color-gray-5)" />
      </ThemeIcon>
      <Stack gap={4} align="center">
        <Text size="xl" fw={600} c="dark.3">
          {title}
        </Text>
        <Text c="dimmed" size="sm" ta="center" maw={400}>
          {description}
        </Text>
      </Stack>
      {action && (
        <React.Fragment>
          {action}
        </React.Fragment>
      )}
    </Stack>
  );
}
