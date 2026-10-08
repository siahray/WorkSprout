'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const POLL_INTERVAL_MS = 15000

export function TimerSync({ running }: { running: boolean }) {
  const { refresh } = useRouter()

  useEffect(() => {
    if (!running) return

    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)

    const timer = setInterval(() => refresh(), POLL_INTERVAL_MS)

    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh, running])

  return null
}