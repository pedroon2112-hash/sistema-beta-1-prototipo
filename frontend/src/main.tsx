import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { queryClient } from './lib/queryClient'
import { Toaster } from '@/components/ui/sonner'
import { OrderProvider } from '@/context/OrderContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <OrderProvider>
          <App />
          {/* Deslocado acima da barra flutuante do carrinho para não cobrir o clique no mobile. */}
          <Toaster mobileOffset={{ bottom: '92px' }} duration={2200} />
        </OrderProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
