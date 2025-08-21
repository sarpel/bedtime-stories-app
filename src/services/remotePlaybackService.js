// Cihaz (Pi Zero) üzerinde sunucunun hoparlörden masalı çalmasını tetikleyen basit servis
// Güvenlik gereksiz: tek cihaz, lokal ağ varsayımı.

class RemotePlaybackService {
    async getStatus() {
        try {
            const res = await fetch('/api/play/status');
            if (!res.ok) throw new Error('Durum alınamadı');
            return await res.json();
        } catch (e) {
            return { playing: false, error: e.message };
        }
    }

    async play(storyId) {
        const res = await fetch(`/api/play/${storyId}`, { method: 'POST' });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || 'Oynatma başlatılamadı');
        }
        return res.json();
    }

    async stop() {
        const res = await fetch('/api/play/stop', { method: 'POST' });
        if (!res.ok) throw new Error('Durdurma başarısız');
        return res.json();
    }
}

const remotePlaybackService = new RemotePlaybackService();
export default remotePlaybackService;
