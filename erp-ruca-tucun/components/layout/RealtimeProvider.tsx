'use client'

interface RealtimeProviderProps {
  userId: string
  children: React.ReactNode
}

export default function RealtimeProvider({ userId: _userId, children }: RealtimeProviderProps) {
  return <>{children}</>
}
