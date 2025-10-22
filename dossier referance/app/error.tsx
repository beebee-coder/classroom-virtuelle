'use client' // Error components must be Client Components
 
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
 
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])
 
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground text-center p-4">
      <h2 className="text-2xl font-bold mb-4">Quelque chose s'est mal passé !</h2>
      <p className="mb-6 text-muted-foreground">
        Une erreur inattendue est survenue. Veuillez réessayer.
      </p>
      <Button
        onClick={
          // Attempt to recover by trying to re-render the segment
          () => reset()
        }
      >
        Réessayer
      </Button>
    </div>
  )
}
