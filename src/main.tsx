import PwaUpdates from './pwa/PwaControls'
import { startPwa } from './pwa/state'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AppRouter from "./features/auth/components/appRouter";

// Create a query clent for the whole application
const queryClient = new QueryClient({defaultOptions: {
  queries:{
    staleTime: 60 * 1000 * 3,
    retry: 3
  }
}});

startPwa()

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
          <AppRouter />
          <PwaUpdates />
      </QueryClientProvider>
    </StrictMode>,
  )
}
