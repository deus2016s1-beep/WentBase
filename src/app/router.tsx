import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/AppLayout';
import { RequireAuth } from '../guards/RequireAuth';
import { RequireRole } from '../guards/RequireRole';
import { CashJournalPage } from '../pages/CashJournalPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../pages/LoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PartnersPage } from '../pages/PartnersPage';
import { ProjectDetailsPage } from '../pages/ProjectDetailsPage';
import { ProjectsPage } from '../pages/ProjectsPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole allowedRoles={['admin', 'viewer']} />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              { path: '/dashboard', element: <DashboardPage /> },
              { path: '/projects', element: <ProjectsPage /> },
              { path: '/projects/:projectId', element: <ProjectDetailsPage /> },
              { path: '/cash-journal', element: <CashJournalPage /> },
              { path: '/partners', element: <PartnersPage /> }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    element: <NotFoundPage />
  }
]);
