import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="text-center min-h-screen flex flex-col items-center justify-center">
      <h1 className="text-6xl mb-4 font-bold">404</h1>
      <p className="mb-6 text-lg">Page not found</p>
      <Button onClick={() => navigate('/')} variant="outline">
        Return home
      </Button>
    </div>
  )
}
