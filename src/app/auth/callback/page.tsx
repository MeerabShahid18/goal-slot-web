'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '@/lib/store'

export default function AuthCallbackPage() {
  const router = useRouter()
  const params = useSearchParams()
  const setTokens = useAuthStore((s) => s.setTokens)
  const loadUser = useAuthStore((s) => s.loadUser)

  useEffect(() => {
    const token = params.get('token')
    const refresh = params.get('refresh')

    if (!token) {
      toast.error('Authentication failed')
      router.replace('/login')
      return
    }

    setTokens(token, refresh || '')

    ;(async () => {
      try {
        await loadUser()
      } catch (err) {
        // ignore
      }
      router.replace('/dashboard')
    })()
  }, [params, router, setTokens, loadUser])

  return <div className="min-h-screen flex items-center justify-center">Signing you in…</div>
}
