import { create } from 'zustand'
import api from '../api/client'

// Whether the server has AI configured; fetched once and shared by every AI widget.
export const useAiStore = create((set, get) => ({
  enabled: null,
  async load() {
    if (get().enabled !== null) return
    try {
      const { data } = await api.get('/ai/status')
      set({ enabled: data.enabled })
    } catch {
      set({ enabled: false })
    }
  },
}))
