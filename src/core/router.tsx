import { createBrowserRouter } from 'react-router-dom';
import ProtectedRoute from '../shared/components/ProtectedRoute';

import LoginPage from '../modules/auth/LoginPage';
import AppLayout from '../shared/ui/AppLayout';
import DashboardPage from '../modules/reports/DashboardPage';
import NuevoReportePage from '../modules/reports/NuevoReportePage';
import CircuitosPage from '../modules/reports/CircuitosPage';
import EditorParesPage from '../modules/reports/EditorParesPage';
import AdminCatalogosPage from '../modules/admin/AdminCatalogosPage';
import MassUploadPage from '../modules/reports/MassUploadPage';
import PrevisualizacionPdfPage from '../modules/export/PrevisualizacionPdfPage';
import ExportacionPage from '../modules/export/ExportacionPage';


export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    // Guardián principal: verifica sesión activa
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'reportes/nuevo',
            element: <NuevoReportePage />
          },
          {
            path: 'reportes/:id/circuitos',
            element: <CircuitosPage />
          },
          {
            path: 'reportes/:reporteId/circuitos/:circuitoId/pares',
            element: <EditorParesPage />
          },
          {
            path: 'reportes/:reporteId/circuitos/:circuitoId/carga-masiva',
            element: <MassUploadPage />
          },
          {
            path: 'reportes/:reporteId/exportar',
            element: <ExportacionPage />
          },
          {
            path: 'reportes/:reporteId/exportar/pdf',
            element: <PrevisualizacionPdfPage />
          },
          {
            // Ruta exclusiva de ADMINISTRADOR
            path: 'admin/catalogos',
            element: <ProtectedRoute requireAdmin={true} />,
            children: [
              {
                index: true,
                element: <AdminCatalogosPage />,
              }
            ],
          },
        ],
      },
    ],
  },
]);
