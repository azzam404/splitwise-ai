import { create } from 'zustand'
import api from '../api/client'

export const useAuthStore = create((set) => ({
  user: null,
  // 'idle' until the first session check finishes, so routes don't redirect too early.
  status: 'idle',

  async loadSession() {
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data.user, status: 'ready' })
    } catch {
      try {
        const { data } = await api.post('/auth/refresh')
        set({ user: data.user, status: 'ready' })
      } catch {
        set({ user: null, status: 'ready' })
      }
    }
  },

  async login(credentials) {
    const { data } = await api.post('/auth/login', credentials)
    set({ user: data.user })
  },

  async register(details) {
    const { data } = await api.post('/auth/register', details)
    set({ user: data.user })
  },

  async logout() {
    await api.post('/auth/logout').catch(() => {})
    set({ user: null })
  },
}))
