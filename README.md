# ManHQ - Leitor de Mangás e HQ Comics

Um leitor de mangás e HQ comics moderno, mobile-first e progressivo (PWA) construído com Next.js 15, React 19, e Tailwind CSS.

## 🚀 Características

- **Mobile-First**: Interface otimizada para dispositivos móveis
- **PWA**: Instale como um aplicativo no seu dispositivo
- **Design Moderno**: Interface elegante com tema escuro
- **Animações Suaves**: Usando Framer Motion
- **Leitor Otimizado**: Experiência de leitura imersiva com scroll vertical
- **Biblioteca Pessoal**: Acompanhe seus mangás favoritos
- **Busca Avançada**: Encontre facilmente seus mangás

## 📱 Páginas Principais

- **Home**: Destaques, continuando a ler, populares e recentes
- **Detalhes do Mangá**: Informações completas e lista de capítulos
- **Leitor**: Experiência de leitura imersiva e fluida
- **Busca**: Encontre mangás por título
- **Biblioteca**: Seus mangás favoritos e histórico de leitura
- **Perfil**: Configurações e estatísticas do usuário

## 🛠️ Tecnologias

- **Next.js 15** - Framework React com App Router
- **React 19** - Biblioteca UI
- **Tailwind CSS** - Estilização
- **Framer Motion** - Animações
- **Lucide React** - Ícones
- **TypeScript** - Tipagem estática

## 🎨 Tema de Cores

```css
background: #0f0f0f  /* Fundo principal */
surface: #1e1e1e     /* Superfícies elevadas */
primary: #e50914     /* Destaque (vermelho Netflix) */
textMain: #e5e5e5    /* Texto principal */
textDim: #a3a3a3     /* Texto secundário */
```

## 🔧 Desenvolvimento

```bash
# Instalar dependências
npm install

# Executar em modo de desenvolvimento
npm run dev

# Build para produção
npm run build

# Iniciar servidor de produção
npm start
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## 🌐 Domínio e Proxy

O cliente deve chamar o backend sempre via `/api/*`. Em produção:

- `API_URL` aponta para a origem real do backend/API.
- `NEXT_PUBLIC_SITE_URL` aponta para a URL pública do frontend.
- `TRAEFIK_HOST` define o host publicado pelo container do frontend.

Se o frontend mudar de domínio atrás do Cloudflare:

- mantenha o navegador no domínio do frontend e deixe o proxy do Next encaminhar para `API_URL`
- alinhe o backend com o novo host público em `FRONTEND_URL`
- revise `AUTH_COOKIE_DOMAIN` no backend; se ele continuar preso ao domínio antigo da API, o login pode falhar no novo domínio do frontend
- desative challenges/WAF do Cloudflare nas rotas da API se elas começarem a retornar HTML em vez de JSON

## 📦 Estrutura do Projeto

```
manhq-client/
├── app/                    # App Router do Next.js
│   ├── page.tsx           # Página inicial
│   ├── manga/[id]/        # Detalhes do mangá
│   ├── reader/[id]/[chapter]/ # Leitor
│   ├── search/            # Busca
│   ├── library/           # Biblioteca
│   └── profile/           # Perfil
├── components/            # Componentes reutilizáveis
│   ├── BottomNav.tsx     # Navegação inferior
│   ├── MangaCard.tsx     # Card de mangá
│   └── ...
├── lib/                   # Utilitários
│   └── utils.ts          # Funções auxiliares
└── public/               # Arquivos estáticos
    ├── manifest.json     # PWA manifest
    └── icon.svg          # Ícone do app
```

## 🔄 Próximos Passos

- [ ] Integrar com API real
- [ ] Implementar autenticação
- [ ] Adicionar suporte offline
- [ ] Sistema de favoritos persistente
- [ ] Histórico de leitura
- [ ] Notificações push
- [ ] Modo de leitura horizontal
- [ ] Suporte a múltiplos idiomas

## 📝 Licença

Este projeto está sob a licença MIT.
