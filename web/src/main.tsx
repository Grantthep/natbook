import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { ApiError } from './api'
import './index.css'
import AuthPage from './pages/AuthPage'
import BookingPage from './pages/BookingPage'
import Dashboard from './pages/Dashboard'
import Home from './pages/Home'
import MyBookings, { ManageBooking } from './pages/MyBookings'
import NotFound from './pages/NotFound'

const queryClient = new QueryClient({
  // Don't retry "not logged in" or "not found": they won't fix themselves.
  defaultOptions: { queries: { retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/b/:slug" element={<BookingPage />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/booking/:id" element={<ManageBooking />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
