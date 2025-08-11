// Queue service for DB-backed playlist persistence
// Same-origin backend: dev'de Vite proxy, prod'da aynı origin
const BASE = ''

export const queueService = {
  async getQueueIds() {
    const res = await fetch(`${BASE}/api/queue`)
    if (!res.ok) throw new Error('Kuyruk alınamadı')
    const data = await res.json()
    return Array.isArray(data.ids) ? data.ids : []
  },

  async setQueueIds(ids) {
    const res = await fetch(`${BASE}/api/queue`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    })
    if (!res.ok) throw new Error('Kuyruk güncellenemedi')
    return true
  },

  async add(id) {
    const res = await fetch(`${BASE}/api/queue/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    if (!res.ok) throw new Error('Kuyruğa eklenemedi')
    return true
  },

  async remove(id) {
    const res = await fetch(`${BASE}/api/queue/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Kuyruktan çıkarılamadı')
    return true
  }
}
