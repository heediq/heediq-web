import { Suspense, lazy } from 'react'
import { useTranslation } from 'react-i18next'
import { QueryClientProvider } from '@tanstack/react-query'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { queryClient } from './lib/query-client'
import { AuthProvider } from './lib/auth/AuthContext'
import { ProtectedRoute } from './lib/auth/ProtectedRoute'
import { WsProvider } from './lib/ws/WsProvider'
import { AppShell } from './components/layout/AppShell'
import { FullPageLoading, ToastProvider } from './components/ui'
import { Can } from './lib/rbac/Can'
import { pageVariants, transition } from './lib/motion'
import { HomePage } from './routes/HomePage'
import { AuthCallbackPage } from './routes/AuthCallbackPage'
import { SourcesLibraryPage } from './routes/SourcesLibraryPage'
import { SourceDetailPage } from './routes/SourceDetailPage'
import { ReviewWizardPage } from './routes/ReviewWizardPage'
import { ContextLibraryPage } from './routes/ContextLibraryPage'

// Chat pulls in the markdown/highlight stack — lazy-load it so those deps stay out of the initial bundle.
const ContextChatPage = lazy(() =>
  import('./routes/ContextChatPage').then((m) => ({ default: m.ContextChatPage })),
)
import { SettingsPage } from './routes/SettingsPage'
import { SettingsLinkCallbackPage } from './routes/SettingsLinkCallbackPage'
import { RolesSettingsPage } from './routes/RolesSettingsPage'
import { AuditLogPage } from './routes/AuditLogPage'
import { DevUiGalleryPage } from './routes/DevUiGalleryPage'

function LazyFallback() {
  const { t } = useTranslation()
  return <FullPageLoading aria-label={t('common.loading')} />
}

function PageTransition({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion()
  if (reduceMotion) return <>{children}</>
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
    >
      {children}
    </motion.div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><HomePage /></PageTransition>} />
        <Route path="/auth/callback" element={<PageTransition><AuthCallbackPage /></PageTransition>} />
        <Route
          path="/sources"
          element={
            <ProtectedRoute>
              <AppShell>
                <PageTransition><SourcesLibraryPage /></PageTransition>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sources/:sourceId"
          element={
            <ProtectedRoute>
              <AppShell>
                <PageTransition><SourceDetailPage /></PageTransition>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/sources/:sourceId/review"
          element={
            <ProtectedRoute>
              <AppShell>
                <Can permission="context:read" fallback={<Navigate to="/sources" replace />}>
                  <PageTransition><ReviewWizardPage /></PageTransition>
                </Can>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contexts"
          element={
            <ProtectedRoute>
              <AppShell>
                <Can permission="context:read" fallback={<Navigate to="/sources" replace />}>
                  <PageTransition><ContextLibraryPage /></PageTransition>
                </Can>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contexts/:contextId"
          element={
            <ProtectedRoute>
              <AppShell>
                <Can permission="context:read" fallback={<Navigate to="/sources" replace />}>
                  <PageTransition><ContextLibraryPage /></PageTransition>
                </Can>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/contexts/:contextId/chat"
          element={
            <ProtectedRoute>
              <AppShell>
                <Can permission="context:read" fallback={<Navigate to="/sources" replace />}>
                  <Suspense fallback={<LazyFallback />}>
                    <ContextChatPage />
                  </Suspense>
                </Can>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AppShell>
                <PageTransition><SettingsPage /></PageTransition>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings/roles"
          element={
            <ProtectedRoute>
              <AppShell>
                <Can permission="org:manage-roles" fallback={<Navigate to="/settings" replace />}>
                  <PageTransition><RolesSettingsPage /></PageTransition>
                </Can>
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/org/audit-log"
          element={
            <ProtectedRoute>
              <AppShell>
                <Can permission="audit:read" fallback={<Navigate to="/settings" replace />}>
                  <PageTransition><AuditLogPage /></PageTransition>
                </Can>
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
    </AnimatePresence>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <WsProvider>
              <AnimatedRoutes />
            </WsProvider>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  )
}
