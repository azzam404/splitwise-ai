import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
})

// On a 401, try one silent refresh and replay the original request.
let refreshing = null

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const isAuthCall = original?.url?.startsWith('/auth/')

    if (status === 401 && !original._retried && !isAuthCall) {
      original._retried = true
      refreshing ??= api.post('/auth/refresh').finally(() => {
        refreshing = null
      })
      try {
        await refreshing
        return api(original)
      } catch {
        // Refresh failed; fall through to the original error.
      }
    }
    return Promise.reject(error)
  },
)

export function errorMessage(error, fallback = 'Something went wrong') {
  return error.response?.data?.error?.message || error.message || fallback
}

export default api
