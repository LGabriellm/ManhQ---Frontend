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

## Opção 5: Docker Compose + Traefik (VPS com Orquestração)

Ideal para ambientes com múltiplos serviços (frontend + backend) rodando no mesmo servidor com SSL automático.

### 1. Pré-requisitos

- Docker e Docker Compose instalados
- Traefik já configurado e rodando (na rede `manhq_backend_manhq-net`)
- Domínio apontado para o IP do servidor

### 2. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Frontend
NEXT_PUBLIC_API_URL=https://api.seudominio.com
API_URL=https://api.seudominio.com

# Traefik
TRAEFIK_HOST=app.seudominio.com  # ou seudominio.com
```

### 3. Build e Deploy

```bash
# Build da imagem
docker-compose build

# Iniciar o container
docker-compose up -d

# Verificar logs
docker-compose logs -f frontend
```

### 4. Configuração Automática do Traefik

O `docker-compose.yml` já contém as labels necessárias para o Traefik:

- **Roteamento**: Usa a variável `TRAEFIK_HOST` para definir o domínio
- **SSL/TLS**: Certificado automático via Let's Encrypt
- **Redirect HTTP→HTTPS**: Redireciona todas as requisições HTTP para HTTPS
- **Health Check**: Traefik monitora a saúde do container

### 5. Estrutura de Redes

O container conecta-se à rede existente `manhq_backend_manhq-net`:

```yaml
networks:
  manhq-net:
    external: true
    name: manhq_backend_manhq-net
```

Dessa forma, o frontend pode se comunicar com a API através dessa rede docker.

### 6. Atualizar e Redeployar

```bash
# Pull das mudanças
git pull

# Rebuild e restart
docker-compose up -d --build

# Limpar containers antigos
docker system prune -f
```

### 7. Troubleshooting

**Container não inicia?**

```bash
docker-compose logs frontend
```

**Traefik não detecta o container?**

```bash
# Verifique se a rede existe
docker network ls | grep manhq

# Verifique as labels do container
docker inspect manhq-frontend | grep -A 20 Labels
```

**SSL não funciona?**

- Certifique-se de que `TRAEFIK_HOST` aponta para um domínio real
- Verifique se o Traefik tem acesso ao Let's Encrypt (firewall port 80/443)

---

## Resumo

| Plataforma              | Custo      | Dificuldade  | Recomendado        |
| ----------------------- | ---------- | ------------ | ------------------ |
| Vercel                  | Grátis     | ⭐ Fácil     | ✅ Melhor opção    |
| Docker + Traefik        | Variável   | ⭐⭐ Médio   | ✅ Multi-serviços  |
| Hostinger VPS           | ~R$ 25/mês | ⭐⭐⭐ Médio | ✅ Se já tem VPS   |
| Cloudflare Pages        | Grátis     | ⭐⭐ Médio   | ✅ Boa alternativa |
| Railway                 | Grátis\*   | ⭐ Fácil     | ✅ Boa alternativa |
| Hostinger Compartilhado | —          | —            | ❌ Não funciona    |

> \* Railway tem $5/mês de crédito gratuito.
