'use client'

import { useEffect } from 'react'
import { createClientComponentClient } from '@/lib/supabase'

interface RealtimeProviderProps {
  userId: string
  children: React.ReactNode
}

export default function RealtimeProvider({ userId, children }: RealtimeProviderProps) {
  useEffect(() => {
    const supabase = createClientComponentClient()

    const channel = supabase
      .channel(`notificaciones:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${userId}`
        },
        (payload) => {
          console.log('Nueva notificación:', payload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return <>{children}</>
}
