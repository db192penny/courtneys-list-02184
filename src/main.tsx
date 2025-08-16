import { createRoot } from 'react-dom/client'
import { StrictMode } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import './index.css'

import Index from '@/pages/Index'
import Auth from '@/pages/Auth'
import Dashboard from '@/pages/Dashboard'
import Community from '@/pages/Community'
import CommunityPreview from '@/pages/CommunityPreview'
import HouseholdPreview from '@/pages/HouseholdPreview'
import Household from '@/pages/Household'
import Contact from '@/pages/Contact'
import Privacy from '@/pages/Privacy'
import Terms from '@/pages/Terms'
import NotFound from '@/pages/NotFound'
import SignIn from '@/pages/SignIn'
import SubmitVendor from '@/pages/SubmitVendor'
import CommunityRequest from '@/pages/CommunityRequest'
import Invite from '@/pages/Invite'
import Admin from '@/pages/Admin'
import { AdminProtectedRoute } from '@/components/AdminProtectedRoute'
import AdminUsers from '@/pages/AdminUsers'
import AdminPreviewLinks from '@/pages/AdminPreviewLinks'
import AdminPreviewUsers from '@/pages/AdminPreviewUsers'
import AdminEditVendor from '@/pages/AdminEditVendor'
import AdminVendorManagement from '@/pages/AdminVendorManagement'
import AdminCostManagement from '@/pages/AdminCostManagement'
import AdminVendorSeed from '@/pages/AdminVendorSeed'
import AdminBadges from '@/pages/AdminBadges'
import AdminAddressRequests from '@/pages/AdminAddressRequests'

const queryClient = new QueryClient()

const router = createBrowserRouter([
  {
    path: '/',
    element: <Index />,
  },
  {
    path: '/auth',
    element: <Auth />,
  },
  {
    path: '/signin',
    element: <SignIn />,
  },
  {
    path: '/household',
    element: <Household />,
  },
  {
    path: '/communities/:community',
    element: <Community />,
  },
  {
    path: '/communities/:community/preview',
    element: <CommunityPreview />,
  },
  {
    path: '/household/:sessionToken',
    element: <HouseholdPreview />,
  },
  {
    path: '/submit-vendor',
    element: <SubmitVendor />,
  },
  {
    path: '/contact',
    element: <Contact />,
  },
  {
    path: '/privacy',
    element: <Privacy />,
  },
  {
    path: '/terms',
    element: <Terms />,
  },
  {
    path: '/community-request',
    element: <CommunityRequest />,
  },
  {
    path: '/invite/:token',
    element: <Invite />,
  },
  {
    path: '/dashboard',
    element: <Dashboard />,
  },
  {
    path: '/admin',
    element: (
      <AdminProtectedRoute>
        <Admin />
      </AdminProtectedRoute>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <AdminProtectedRoute>
        <AdminUsers />
      </AdminProtectedRoute>
    ),
  },
  {
    path: '/admin/preview-links',
    element: (
      <AdminProtectedRoute>
        <AdminPreviewLinks />
      </AdminProtectedRoute>
    ),
  },
  {
    path: '/admin/preview-users',
    element: (
      <AdminProtectedRoute>
        <AdminPreviewUsers />
      </AdminProtectedRoute>
    ),
  },
  {
    path: '/admin/vendor/:id/edit',
    element: (
      <AdminProtectedRoute>
        <AdminEditVendor />
      </AdminProtectedRoute>
    ),
  },
  {
    path: '/admin/vendor-management',
    element: (
      <AdminProtectedRoute>
        <AdminVendorManagement />
      </AdminProtectedRoute>
    ),
  },
  {
    path: '/admin/cost-management',
    element: (
      <AdminProtectedRoute>
        <AdminCostManagement />
      </AdminProtectedRoute>
    ),
  },
  {
    path: '/admin/vendor-seed',
    element: (
      <AdminProtectedRoute>
        <AdminVendorSeed />
      </AdminProtectedRoute>
    ),
  },
  {
    path: '/admin/address-requests',
    element: (
      <AdminProtectedRoute>
        <AdminAddressRequests />
      </AdminProtectedRoute>
    ),
  },
  {
    path: '/admin/badges',
    element: (
      <AdminProtectedRoute>
        <AdminBadges />
      </AdminProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <NotFound />,
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>
)
