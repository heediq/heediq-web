import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { queryClient } from './lib/query-client'
import { HomePage } from './routes/HomePage'
import { AuthCallbackPage } from './routes/AuthCallbackPage'
import { SourcesLibraryPage } from './routes/SourcesLibraryPage'
import { SourceDetailPage } from './routes/SourceDetailPage'
import { DevUiGalleryPage } from './routes/DevUiGalleryPage'

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/sources" element={<SourcesLibraryPage />} />
          <Route path="/sources/:sourceId" element={<SourceDetailPage />} />
          {import.meta.env.DEV && <Route path="/dev/ui" element={<DevUiGalleryPage />} />}
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
