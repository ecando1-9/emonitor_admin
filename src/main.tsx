import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { Toaster } from './components/ui/toaster'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import AppRoutes from './App'

const router = createBrowserRouter(AppRoutes, {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster />
  </React.StrictMode>,
)