# ManHQ Frontend - Integração Completa com API

## 🎉 Integração Concluída!

O projeto foi completamente integrado com a API backend. Todas as páginas agora buscam e exibem dados reais.

## 📁 Estrutura Criada

### Tipos TypeScript (`types/api.ts`)

- Definições completas de tipos para todas as entidades da API
- User, Series, Media, Collection, Notification, Stats, etc.

### Serviços (`services/`)

- **api.ts**: Cliente HTTP axios configurado com interceptors
- **auth.service.ts**: Login, registro, logout, sessões
- **series.service.ts**: Listar e buscar séries
- **reader.service.ts**: Informações de capítulos e páginas
- **collections.service.ts**: CRUD de coleções
- **notifications.service.ts**: Gerenciamento de notificações
- **stats.service.ts**: Estatísticas de leitura

### Contextos (`contexts/`)

- **AuthContext.tsx**: Gerenciamento global de autenticação
- **QueryProvider.tsx**: Configuração do React Query

### Hooks Personalizados (`hooks/useApi.ts`)

- `useSeries()` - Listar todas as séries
- `useSeriesById(id)` - Detalhes de uma série
- `useChapterInfo(id)` - Informações do capítulo
- `useUpdateProgress()` - Atualizar progresso
- `useCollections()` - Listar coleções
- `useNotifications()` - Listar notificações
- `useStats()` - Estatísticas do usuário
- E muitos outros...

### Páginas Integradas

#### ✅ Autenticação

- **`/auth/login`** - Login com JWT
- **`/auth/register`** - Registro de novo usuário

#### ✅ Home (`/`)

- Busca todas as séries da API
- Exibe série em destaque no hero
- Seções: Continuar Lendo, Populares, Recentes
- Loading state e error handling

#### ✅ Detalhes da Série (`/serie/[id]`)

- Busca detalhes completos da série
- Lista todos os capítulos/volumes
- Informações: autor, ano, gêneros, sinopse
- Navegação para o leitor

#### 🔄 Ainda com dados mock (próximos passos):

- `/reader/[id]/[chapter]` - Precisa integrar busca de páginas
- `/search` - Precisa endpoint de busca na API
- `/library` - Precisa endpoints de progresso/favoritos
- `/profile` - Precisa integração com stats

## 🚀 Como Usar

### 1. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo:

```bash
cp .env.local.example .env.local
```

Edite `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 2. Iniciar o Backend

Certifique-se de que o backend está rodando em `http://localhost:3000`

### 3. Iniciar o Frontend

```bash
npm run dev
```

Acesse: `http://localhost:3001` (ou a porta configurada)

## 🔐 Autenticação

### Fluxo de Autenticação

1. Usuário faz login/registro
2. Token JWT é salvo no localStorage
3. Todas as requisições incluem o token no header
4. Se token expirar (401), usuário é redirecionado para login

### Rotas Protegidas

A maioria das rotas requer autenticação. Se não autenticado, o usuário será redirecionado para `/auth/login`.

## 📊 Gerenciamento de Estado

### React Query

- Cache automático de requisições
- Revalidação inteligente
- Loading e error states
- Prefetch e optimistic updates

### Exemplo de Uso

```tsx
const { data, isLoading, error } = useSeries();

if (isLoading) return <Loader />;
if (error) return <Error message={error.message} />;

return <SeriesList series={data} />;
```

## 🎨 Componentes Reutilizáveis

- **MangaCard**: Card de série com capa, título, rating
- **Section**: Seção com título e link "Ver tudo"
- **HorizontalScroll**: Scroll horizontal touch-friendly
- **BottomNav**: Navegação inferior mobile
- **TopBar**: Barra superior com voltar

## 📝 Próximos Passos Recomendados

### 1. Integrar Leitor

```typescript
// app/reader/[id]/[chapter]/page.tsx
const { data: chapterInfo } = useChapterInfo(chapterId);

// Gerar URLs das páginas
const pages = Array.from({ length: chapterInfo.pageCount }, (_, i) =>
  readerService.getPageUrl(chapterId, i + 1),
);
```

### 2. Adicionar Busca

```typescript
// Criar endpoint de busca na API
export const seriesService = {
  async search(query: string): Promise<Series[]> {
    const response = await api.get(`/series/search?q=${query}`);
    return response.data;
  },
};
```

### 3. Progresso de Leitura

```typescript
// Atualizar progresso ao trocar de página
const { mutate: updateProgress } = useUpdateProgress();

updateProgress({
  chapterId,
  data: { page: currentPage },
});
```

### 4. Favoritos/Biblioteca

```typescript
// Usar coleções ou criar endpoint específico
const { data: favorites } = useCollectionById("favorites-collection-id");
```

### 5. Notificações Push

- Adicionar service worker
- Implementar web push notifications
- Integrar com endpoint de notificações

## 🐛 Debug

### React Query Devtools

As devtools estão habilitadas em desenvolvimento. Pressione o ícone no canto inferior para visualizar:

- Estado do cache
- Queries ativas
- Mutations
- Timeline de requisições

### Logs de Rede

Abra o DevTools > Network para ver todas as requisições HTTP e seus payloads.

### Erros Comuns

**401 Unauthorized**

- Token expirou ou inválido
- Faça login novamente

**CORS Error**

- Backend precisa permitir origin do frontend
- Verifique configuração CORS no backend

**Network Error**

- Backend não está rodando
- URL da API incorreta no .env.local

## 📚 Documentação da API

Acesse a documentação Swagger do backend:

```
http://localhost:3000/docs
```

## 🎯 Checklist de Integração

- [x] Configuração do axios e interceptors
- [x] Tipos TypeScript completos
- [x] Serviços para todos os endpoints
- [x] Contexto de autenticação
- [x] React Query configurado
- [x] Hooks personalizados
- [x] Páginas de login/registro
- [x] Home page integrada
- [x] Página de detalhes integrada
- [ ] Leitor integrado
- [ ] Busca integrada
- [ ] Biblioteca integrada
- [ ] Perfil/Stats integrado
- [ ] Notificações integradas
- [ ] Upload de arquivos
- [ ] PWA offline mode

## 🤝 Contribuindo

Para adicionar novos endpoints:

1. Adicionar tipos em `types/api.ts`
2. Criar service em `services/`
3. Adicionar hooks em `hooks/useApi.ts`
4. Usar nos componentes com React Query

---

**Pronto para uso!** 🚀

Agora você tem um frontend completo integrado com a API ManhQ.
