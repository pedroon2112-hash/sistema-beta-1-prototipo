import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'
import { Toaster } from '@/components/ui/sonner'
import { OrderProvider } from '@/context/OrderContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <OrderProvider>
          <App />
          <Toaster mobileOffset={{ bottom: '92px' }} duration={2200} />
        </OrderProvider>
      </HashRouter>
    </QueryClientProvider>
  </StrictMode>,
)
