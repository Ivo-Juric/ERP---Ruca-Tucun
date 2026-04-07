'use client'

interface RealtimeProviderProps {
  userId: string
  children: React.ReactNode
}

export default function RealtimeProvider({ children }: RealtimeProviderProps) {
  return <>{children}</>
}
