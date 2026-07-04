import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { queryClient } from './lib/query-client'
import { AuthProvider } from './lib/auth/AuthContext'
import { ProtectedRoute } from './lib/auth/ProtectedRoute'
import { AppShell } from './components/layout/AppShell'
import { HomePage } from './routes/HomePage'
import { AuthCallbackPage } from './routes/AuthCallbackPage'
import { SourcesLibraryPage } from './routes/SourcesLibraryPage'
import { SourceDetailPage } from './routes/SourceDetailPage'
import { SettingsPage } from './routes/SettingsPage'
import { SettingsLinkCallbackPage } from './routes/SettingsLinkCallbackPage'
import { DevUiGalleryPage } from './routes/DevUiGalleryPage'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route
              path="/sources"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <SourcesLibraryPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/sources/:sourceId"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <SourceDetailPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <SettingsPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/link-callback"
              element={
                <ProtectedRoute>
                  <SettingsLinkCallbackPage />
                </ProtectedRoute>
              }
            />
            {import.meta.env.DEV && <Route path="/dev/ui" element={<DevUiGalleryPage />} />}
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
