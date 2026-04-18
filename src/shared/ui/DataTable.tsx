import { useState } from 'react';
import { Table, Group, ActionIcon, Pagination, Modal, Text, Button } from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';

interface Column {
  key: string;
  label: string;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  itemsPerPage?: number;
  onEdit?: (item: any) => void;
  onDelete?: (id: string) => void;
}

export default function DataTable({ columns, data, itemsPerPage = 5, onEdit, onDelete }: DataTableProps) {
  const [activePage, setPage] = useState(1);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);

  // Lógica controlada de paginación
  const startIndex = (activePage - 1) * itemsPerPage;
  const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  const confirmDelete = () => {
    if (itemToDelete && onDelete) {
      onDelete(itemToDelete.id);
      
      // Auto return de la paginacion si borramos algo en la ultima pagina y se queda vacía
      if (paginatedData.length === 1 && activePage > 1) {
        setPage(activePage - 1);
      }
    }
    setDeleteModalOpened(false);
    setItemToDelete(null);
  };

  const openDeleteModal = (item: any) => {
    setItemToDelete(item);
    setDeleteModalOpened(true);
  };

  return (
    <>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            {columns.map((col) => (
              <Table.Th key={col.key}>{col.label}</Table.Th>
            ))}
            {(onEdit || onDelete) && <Table.Th>Acciones</Table.Th>}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {paginatedData.length > 0 ? (
            paginatedData.map((item) => (
              <Table.Tr key={item.id}>
                {columns.map((col) => (
                  <Table.Td key={`${item.id}-${col.key}`}>{item[col.key]}</Table.Td>
                ))}
                {(onEdit || onDelete) && (
                  <Table.Td>
                    <Group gap="xs">
                      {onEdit && (
                        <ActionIcon color="blue" variant="subtle" onClick={() => onEdit(item)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                      )}
                      {onDelete && (
                        <ActionIcon color="red" variant="subtle" onClick={() => openDeleteModal(item)}>
                          <IconTrash size={16} />
                        </ActionIcon>
                      )}
                    </Group>
                  </Table.Td>
                )}
              </Table.Tr>
            ))
          ) : (
             <Table.Tr>
               <Table.Td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} style={{ textAlign: 'center', padding: '2rem' }}>
                 <Text c="dimmed">No hay registros con los filtros actuales</Text>
               </Table.Td>
             </Table.Tr>
          )}
        </Table.Tbody>
      </Table>

      {totalPages > 1 && (
        <Group justify="center" mt="md">
          <Pagination total={totalPages} value={activePage} onChange={setPage} />
        </Group>
      )}

      {/* Modal Cauteloso de Confirmación Independiente */}
      <Modal opened={deleteModalOpened} onClose={() => setDeleteModalOpened(false)} title="Confirmar eliminación">
        <Text size="sm" mb="xl">
          ¿Estás seguro de que deseas eliminar <strong>{itemToDelete?.nombre || 'este registro'}</strong>? 
          <br /><br />
          Esta acción lo desactivará manteniendo su integridad histórica referenciada, pero desaparecerá del panel y listas operativas.
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setDeleteModalOpened(false)}>Cancelar</Button>
          <Button color="red" onClick={confirmDelete}>Eliminar</Button>
        </Group>
      </Modal>
    </>
  );
}
