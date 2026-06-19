import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import EmptyState from '../EmptyState';
import React from 'react';

// Envoltura para proveer el contexto de Mantine en los tests
const renderWithMantine = (ui: React.ReactElement) => {
  return render(<MantineProvider>{ui}</MantineProvider>);
};

describe('Componente EmptyState', () => {
  it('debería renderizar el título y la descripción correctamente', () => {
    renderWithMantine(
      <EmptyState
        title="Sin elementos"
        description="No hay elementos para mostrar en este momento."
      />
    );

    expect(screen.getByText('Sin elementos')).toBeInTheDocument();
    expect(screen.getByText('No hay elementos para mostrar en este momento.')).toBeInTheDocument();
  });

  it('debería renderizar el botón o elemento de acción cuando se proporciona', () => {
    renderWithMantine(
      <EmptyState
        title="Sin elementos"
        description="No hay elementos."
        action={<button data-testid="action-btn">Crear elemento</button>}
      />
    );

    expect(screen.getByTestId('action-btn')).toBeInTheDocument();
    expect(screen.getByText('Crear elemento')).toBeInTheDocument();
  });
});
