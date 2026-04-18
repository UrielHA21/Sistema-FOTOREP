import React, { useState, useEffect } from 'react';
import { Container, Title, Tabs, Group, Button, Modal, TextInput, Select, Stack, Loader, Center, ActionIcon, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconMap, IconMapPin, IconUsers, IconPlus, IconSettings } from '@tabler/icons-react';
import DataTable from '../../shared/ui/DataTable';
import { catalogosService, type BaseCatalog } from './catalogos.service';
import EditGlobalConfigModal from './components/EditGlobalConfigModal';

export default function AdminCatalogosPage() {
  const [activeTab, setActiveTab] = useState<string | null>('zonas');
  const [configModalOpened, { open: openConfigModal, close: closeConfigModal }] = useDisclosure(false);

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={2}>Administración de Catálogos</Title>
        <Tooltip label="Configuración Global de Firma" position="left">
          <ActionIcon variant="light" color="gray" size="lg" onClick={openConfigModal}>
            <IconSettings size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <EditGlobalConfigModal opened={configModalOpened} onClose={closeConfigModal} />

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="md">
          <Tabs.Tab value="zonas" leftSection={<IconMap size={16} />}>Zonas</Tabs.Tab>
          <Tabs.Tab value="areas" leftSection={<IconMapPin size={16} />}>Áreas</Tabs.Tab>
          <Tabs.Tab value="revisores" leftSection={<IconUsers size={16} />}>Personal Revisor</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="zonas">
          <CatalogoManager 
            title="Zonas" 
            collectionName="zonas" 
            columns={[{ key: 'nombre', label: 'Nombre de la Zona' }]} 
            fields={[{ key: 'nombre', label: 'Nombre' }]} 
          />
        </Tabs.Panel>

        <Tabs.Panel value="areas">
          <CatalogoManager 
            title="Áreas" 
            collectionName="areas" 
            columns={[
              { key: 'nombre', label: 'Nombre del Área' },
              { key: 'zonaNombre', label: 'Zona Asociada' }
            ]} 
            fields={[
              { key: 'nombre', label: 'Nombre' },
              { key: 'zonaId', label: 'Zona de Referencia', type: 'select', relationCol: 'zonas' }
            ]} 
          />
        </Tabs.Panel>

        <Tabs.Panel value="revisores">
          <CatalogoManager 
            title="Personal Revisor" 
            collectionName="personal_revisor" 
            columns={[
              { key: 'nombre', label: 'Nombre del Revisor' },
              { key: 'areaNombre', label: 'Área Asociada' }
            ]} 
            fields={[
              { key: 'nombre', label: 'Nombre Completo' },
              { key: 'areaId', label: 'Área Operativa', type: 'select', relationCol: 'areas' }
            ]} 
          />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}

// Subcomponente reutilizable en cascada para administrar cada colección según los fields
function CatalogoManager({ title, collectionName, columns, fields }: any) {
  const [data, setData] = useState<BaseCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Opciones temporales capturadas si es que el modulo tiene campos 'select' relacionados
  const [relationsOptions, setRelationsOptions] = useState<{ [key: string]: {value: string, label: string}[] }>({});

  const [modalOpened, setModalOpened] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  
  // Form general
  const [formData, setFormData] = useState<any>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await catalogosService.getCollection(collectionName);
      let enhancedData = [...res];

      for (const f of fields) {
         if (f.type === 'select' && f.relationCol) {
            const relData = await catalogosService.getCollection(f.relationCol);
            
            setRelationsOptions(prev => ({
              ...prev,
              [f.key]: relData.map(r => ({ value: r.id, label: r.nombre }))
            }));

            // Imprimimos el nombre relacional sustituyendo el Id en la tabla visualmente.
            enhancedData = enhancedData.map(item => {
               const relItem = relData.find(r => r.id === item[f.key]);
               const keyname = f.key.replace('Id', 'Nombre'); 
               return { ...item, [keyname]: relItem ? relItem.nombre : '-' };
            });
         }
      }
      setData(enhancedData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [collectionName]);

  const handleOpenModal = (item?: any) => {
    setEditingItem(item || null);
    if (item) {
       setFormData(item);
    } else {
       setFormData({});
    }
    setModalOpened(true);
  };

  const handleCloseModal = () => {
    setModalOpened(false);
    setFormData({});
    setEditingItem(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      await catalogosService.updateDocument(collectionName, editingItem.id, formData);
    } else {
      await catalogosService.addDocument(collectionName, formData);
    }
    handleCloseModal();
    loadData(); // Refrescar lista completa tras el cambio.
  };

  const handleDelete = async (id: string) => {
    await catalogosService.deleteDocument(collectionName, id);
    loadData();
  };

  return (
    <>
      <Group justify="space-between" mb="md" mt="sm">
        <Title order={4}>Catálogo: {title}</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => handleOpenModal()}>
          Agregar {title}
        </Button>
      </Group>

      {loading ? (
        <Center py="xl"><Loader /></Center>
      ) : (
        <DataTable 
          columns={columns} 
          data={data} 
          onEdit={handleOpenModal} 
          onDelete={handleDelete} 
        />
      )}

      {/* Modal Agregar/Editar Dinámico */}
      <Modal opened={modalOpened} onClose={handleCloseModal} title={editingItem ? `Editar ${title}` : `Agregar ${title}`}>
        <form onSubmit={handleSave}>
          <Stack gap="md">
            {fields.map((f: any) => (
              f.type === 'select' ? (
                <Select 
                  key={f.key} 
                  label={f.label} 
                  required 
                  data={relationsOptions[f.key] || []}
                  value={formData[f.key] || null} 
                  onChange={(val) => setFormData({ ...formData, [f.key]: val })} 
                />
              ) : (
                <TextInput 
                  key={f.key} 
                  label={f.label} 
                  required 
                  value={formData[f.key] || ''} 
                  onChange={(e) => setFormData({ ...formData, [f.key]: e.currentTarget.value })} 
                />
              )
            ))}
            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={handleCloseModal}>Cancelar</Button>
              <Button type="submit">Guardar</Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
