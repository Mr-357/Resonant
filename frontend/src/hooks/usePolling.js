import { useEffect, useRef } from 'react'
import axios from 'axios'

export function usePolling(channelId, callback, interval = 2000) {
  const pollingRef = useRef(null)

  useEffect(() => {
    if (!channelId) return

    const poll = async () => {
      try {
        const token = localStorage.getItem('token')
        const sinceTimestamp = localStorage.getItem(`channel_${channelId}_last_fetch`) || 0
        
        const response = await axios.get(`/api/channels/${channelId}/messages`, {
          params: { since: sinceTimestamp, limit: 50 },
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.data.length > 0) {
          callback(response.data)
          localStorage.setItem(
            `channel_${channelId}_last_fetch`,
            new Date(response.data[response.data.length - 1].createdAt).getTime()
          )
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }

    // Initial fetch
    poll()

    // Set up polling interval
    pollingRef.current = setInterval(poll, interval)

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
    }
  }, [channelId, callback, interval])
}
