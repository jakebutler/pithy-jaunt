import { createRouter } from './router'
import { RouterProvider } from '@tanstack/react-router'

const router = createRouter()

function App() {
  return <RouterProvider router={router} />
}

export default App
