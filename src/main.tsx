import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider, createTheme } from '@mantine/core'
import '@mantine/core/styles.css'
import './index.css'
import App from './App.tsx'

const theme = createTheme({
  primaryColor: 'indigo',
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  defaultRadius: 'md',
  colors: {
    indigo: [
      '#eef2ff', '#e0e7ff', '#c7d2fe', '#a5b4fc', '#818cf8',
      '#6366f1', '#4f46e5', '#4338ca', '#3730a3', '#312e81',
    ],
  },
  headings: { fontWeight: '700' },
  components: {
    Paper: { defaultProps: { shadow: 'xs', radius: 'md' } },
    Badge: { defaultProps: { radius: 'xl' } },
    Modal: { defaultProps: { radius: 'lg', overlayProps: { backgroundOpacity: 0.35, blur: 4 } } },
    Progress: { defaultProps: { radius: 'xl' } },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <App />
    </MantineProvider>
  </StrictMode>,
)
