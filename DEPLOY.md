# Deploy - ManhQ Client

## O que é `output: "standalone"`?

O build gera uma pasta `.next/standalone/` com tudo necessário para rodar o app **sem `node_modules`**. É a forma mais leve de fazer deploy de Next.js em um servidor.

---

## Opção 1: Hostinger VPS (Recomendado)

> **Importante**: Hosting compartilhado da Hostinger **NÃO funciona** com Next.js.
> Você precisa de um plano **VPS** (KVM ou Cloud).

### 1. Acessar o VPS via SSH

```bash
ssh root@SEU_IP_VPS
```

### 2. Instalar Node.js 22

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
```

### 3. Clonar e buildar o projeto

```bash
cd /opt
git clone SEU_REPO manhq-client
cd manhq-client
npm install
npm run build
```

### 4. Preparar a pasta standalone

```bash
# Copiar arquivos estáticos para standalone
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
```

### 5. Configurar variáveis de ambiente

```bash
cat > .next/standalone/.env.local << EOF
NEXT_PUBLIC_API_URL=https://sua-api.com
EOF
```

### 6. Rodar com PM2 (process manager)

```bash
npm install -g pm2

cd .next/standalone
PORT=3000 pm2 start server.js --name manhq-client

# Salvar para reiniciar automaticamente
pm2 save
pm2 startup
```

### 7. Configurar Nginx como reverse proxy

```nginx
# /etc/nginx/sites-available/manhq
server {
    listen 80;
    server_name seudominio.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/manhq /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### 8. SSL com Let's Encrypt (opcional, recomendado)

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d seudominio.com
```

---

## Opção 2: Vercel (Gratuito, mais fácil)

A forma mais simples de hospedar Next.js. Plano gratuito é generoso.

### 1. Instalar Vercel CLI

```bash
npm i -g vercel
```

### 2. Deploy

```bash
cd manhq-client
vercel
```

Siga as instruções interativas. O deploy é automático a cada `git push` se conectar ao GitHub.

### Variáveis de ambiente

No dashboard da Vercel (vercel.com), vá em **Settings → Environment Variables** e adicione:

```
NEXT_PUBLIC_API_URL = https://sua-api.com
```

---

## Opção 3: Cloudflare Pages (Gratuito)

Suporta Next.js via `@cloudflare/next-on-pages`.

```bash
npm install -D @cloudflare/next-on-pages
npx @cloudflare/next-on-pages
```

Deploy via Cloudflare Dashboard conectando o repositório GitHub.

---

## Opção 4: Railway / Render (VPS gerenciado)

Ambos suportam Next.js nativamente:

- **Railway**: railway.app — conecta ao GitHub, deploy automático
- **Render**: render.com — plano gratuito disponível

Configure o **Build Command** como `npm run build` e o **Start Command** como `node .next/standalone/server.js`.

---

## Resumo

| Plataforma              | Custo      | Dificuldade  | Recomendado        |
| ----------------------- | ---------- | ------------ | ------------------ |
| Vercel                  | Grátis     | ⭐ Fácil     | ✅ Melhor opção    |
| Hostinger VPS           | ~R$ 25/mês | ⭐⭐⭐ Médio | ✅ Se já tem VPS   |
| Cloudflare Pages        | Grátis     | ⭐⭐ Médio   | ✅ Boa alternativa |
| Railway                 | Grátis\*   | ⭐ Fácil     | ✅ Boa alternativa |
| Hostinger Compartilhado | —          | —            | ❌ Não funciona    |

> \* Railway tem $5/mês de crédito gratuito.
