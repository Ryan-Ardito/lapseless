import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'

const NOTIF_ID = 'network-retrying'

export function RetryIndicator() {
  const qc = useQueryClient()
  const shownRef = useRef(false)

  useEffect(() => {
    const cache = qc.getQueryCache()
    const check = () => {
      const retrying = cache.getAll().some(
        (q) => q.state.fetchStatus === 'fetching' && q.state.fetchFailureCount > 0,
      )
      if (retrying && !shownRef.current) {
        shownRef.current = true
        notifications.show({
          id: NOTIF_ID,
          loading: true,
          title: 'Reconnecting…',
          message: 'Network hiccup, retrying',
          autoClose: false,
          withCloseButton: false,
        })
      } else if (!retrying && shownRef.current) {
        shownRef.current = false
        notifications.hide(NOTIF_ID)
      }
    }
    const unsub = cache.subscribe(check)
    check()
    return unsub
  }, [qc])

  return null
}
