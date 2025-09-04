# Bedtime Stories App - Proxmox Deployment Guide

## Container Özellikler (LXC Container)

### Minimum Sistem Gereksinimleri
- **İşletim Sistemi**: Ubuntu 22.04 LTS (önerilen) veya Debian 12
- **Mimarı**: x64 (amd64)
- **RAM**: 2 GB (minimum), 4 GB (önerilen)
- **CPU**: 2 vCPU (minimum), 4 vCPU (önerilen)
- **Disk**: 20 GB (minimum), 40 GB (önerilen)
- **Network**: Bridge ile internet erişimi

### Proxmox Container Template
```
Template: ubuntu-22.04-standard
CT ID: 100 (veya mevcut)
Hostname: bedtime-stories
Root Password: [güçlü parola]
```

### Container Konfigürasyonu
```
Memory (MB): 4096
Swap (MB): 1024
CPU cores: 4
CPU units: 1024
Root disk (GB): 40
Network: vmbr0 (DHCP veya static)
Start at boot: Yes
Unprivileged container: Yes (önerilen)
```

## Kurulum Adımları

### 1. Proxmox'ta Container Oluşturma

```bash
# Proxmox host üzerinde container oluştur
pct create 100 local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst \
  --hostname bedtime-stories \
  --memory 4096 \
  --swap 1024 \
  --cores 4 \
  --rootfs local-lvm:40 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --onboot 1 \
  --unprivileged 1
```

### 2. Container Başlatma ve Erişim
```bash
# Container'ı başlat
pct start 100

# Container'a bağlan
pct enter 100
```

### 3. Otomatik Kurulum
Container içinde aşağıdaki komutları çalıştırın:

```bash
# Root olarak çalıştığınızdan emin olun
sudo su -

# Setup script'i indir
wget https://raw.githubusercontent.com/yourusername/bedtime-stories-app/main/setup_proxmox.sh

# Executable yap
chmod +x setup_proxmox.sh

# Kurulumu başlat
./setup_proxmox.sh
```

### 4. API Anahtarlarını Yapılandırma

Kurulum tamamlandıktan sonra:

```bash
# Backend .env dosyasını düzenle
nano /opt/bedtime-stories/backend/.env

# Aşağıdaki API anahtarlarını girin:
OPENAI_API_KEY=sk-your-openai-key-here
ELEVENLABS_API_KEY=your-elevenlabs-key-here

# Alternatif olarak Gemini kullanabilirsiniz:
GEMINI_LLM_API_KEY=your-gemini-key-here
GEMINI_TTS_API_KEY=your-gemini-key-here

# Servisi yeniden başlat
sudo -u storyapp pm2 restart bedtime-stories
```

## Port Yapılandırması

### Container İçi Portlar
- **Backend API**: 3001
- **Nginx (Web)**: 80, 443

### Proxmox Firewall Kuralları
```bash
# Container firewall kuralları (Proxmox web interface)
Direction: In, Action: ACCEPT, Protocol: TCP, Dest. port: 80
Direction: In, Action: ACCEPT, Protocol: TCP, Dest. port: 443
Direction: In, Action: ACCEPT, Protocol: TCP, Dest. port: 22 (SSH)
```

## Network Yapılandırması

### Static IP (Opsiyonel)
Container'da static IP kullanmak istiyorsanız:

```bash
# /etc/netplan/00-installer-config.yaml
network:
  version: 2
  ethernets:
    eth0:
      addresses:
        - 192.168.1.100/24
      gateway4: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4

# Apply changes
netplan apply
```

## Güvenlik Yapılandırması

### SSL Sertifikası (Let's Encrypt)
```bash
# SSL sertifikası için certbot kur
apt install certbot python3-certbot-nginx

# Domain için sertifika al (domain'iniz varsa)
certbot --nginx -d stories.yourdomain.com

# Auto-renewal test
certbot renew --dry-run
```

### Fail2ban (Opsiyonel)
```bash
# SSH brute force koruması
apt install fail2ban

cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
EOF

systemctl restart fail2ban
```

## Backup ve Maintenance

### Otomatik Backup Script
```bash
#!/bin/bash
# /opt/bedtime-stories/backup.sh

BACKUP_DIR="/opt/bedtime-stories/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
cp /opt/bedtime-stories/database/stories.db $BACKUP_DIR/stories_$DATE.db

# Media files backup
tar -czf $BACKUP_DIR/media_$DATE.tar.gz /opt/bedtime-stories/media/

# Config backup
cp /opt/bedtime-stories/backend/.env $BACKUP_DIR/env_$DATE.backup

# Keep only last 7 backups
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

### Crontab için
```bash
# Root crontab'e ekle
crontab -e

# Her gün gece 2'de backup al
0 2 * * * /opt/bedtime-stories/backup.sh >> /opt/bedtime-stories/logs/backup.log 2>&1
```

## Monitoring ve Logs

### PM2 Monitoring
```bash
# Process durumu
sudo -u storyapp pm2 status

# Canlı loglar
sudo -u storyapp pm2 logs bedtime-stories

# Sistem resource kullanımı
sudo -u storyapp pm2 monit
```

### System Logs
```bash
# Application logs
tail -f /opt/bedtime-stories/logs/*.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs
journalctl -u bedtime-stories -f
journalctl -u nginx -f
```

## Güncelleme

### Uygulama Güncelleme
```bash
cd /opt/bedtime-stories

# Code güncelle
sudo -u storyapp git pull origin main

# Dependencies güncelle
sudo -u storyapp npm install
cd backend && sudo -u storyapp npm install && cd ..

# Build
sudo -u storyapp npm run build

# Restart
sudo -u storyapp pm2 restart bedtime-stories
```

## Troubleshooting

### Yaygın Sorunlar

1. **API anahtarları eksik**
   ```bash
   # Backend .env dosyasını kontrol et
   cat /opt/bedtime-stories/backend/.env
   ```

2. **Port 3001 erişilebilir değil**
   ```bash
   # Backend process kontrolü
   sudo -u storyapp pm2 status
   netstat -tlnp | grep 3001
   ```

3. **Nginx 502 Bad Gateway**
   ```bash
   # Backend çalışıyor mu kontrol et
   curl http://localhost:3001/health
   systemctl status nginx
   ```

4. **Database yazma hatası**
   ```bash
   # Permissions kontrolü
   ls -la /opt/bedtime-stories/database/
   chown -R storyapp:storyapp /opt/bedtime-stories/database/
   ```

### Performance Tuning

Container'ın kaynak kullanımını optimize etmek için:

```bash
# PM2 cluster mode (çoklu instance)
# ecosystem.config.js'de:
instances: 'max'  // CPU core sayısı kadar instance

# Node.js memory limit
# PM2 config'te:
node_args: '--max-old-space-size=1024'
```

## Container Özellikleri Özeti

| Özellik | Minimum | Önerilen | Açıklama |
|---------|---------|----------|----------|
| OS | Ubuntu 22.04 | Ubuntu 22.04 LTS | Stable ve güncel |
| RAM | 2 GB | 4 GB | Node.js + SQLite + Nginx |
| CPU | 2 vCPU | 4 vCPU | Paralel TTS/LLM işlemi |
| Disk | 20 GB | 40 GB | OS + App + Media + Logs |
| Network | Bridge | Bridge | Internet erişimi |

**NOT**: Raspberry Pi butonları ve fonksiyonlarının tamamı korunmuştur. x64 sistemde Raspberry Pi kontrolleri çalışmayacak ancak hata vermeyecektir.