import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MantineProvider, createTheme } from '@mantine/core'
import '@mantine/core/styles.css'
import '@mantine/dropzone/styles.css'
import './index.css'
import { router } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: false,
    },
  },
})

const theme = createTheme({
  primaryColor: 'sage',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  defaultRadius: 'md',
  colors: {
    sage: [
      '#f4f7f5', '#e2ede6', '#c5d9cc', '#a3c4ad', '#7fae8e',
      '#619876', '#4e8462', '#406d50', '#33573f', '#26412f',
    ],
  },
  headings: { fontWeight: '600' },
  components: {
    Paper: { defaultProps: { shadow: 'xs', radius: 'md' } },
    Badge: { defaultProps: { radius: 'xl' } },
    Modal: { defaultProps: { radius: 'lg', overlayProps: { backgroundOpacity: 0.35, blur: 4 } } },
    Progress: { defaultProps: { radius: 'xl' } },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MantineProvider theme={theme} defaultColorScheme="light">
        <RouterProvider router={router} />
      </MantineProvider>
    </QueryClientProvider>
  </StrictMode>,
)
