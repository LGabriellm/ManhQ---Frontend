# ManhQ Backend — Referência Completa de Endpoints

> **Base URL:** `http://localhost:3000`
> **Autenticação:** JWT via header `Authorization: Bearer <token>`
> **Todas as rotas (exceto `/register`, `/login`, `/`) são protegidas.**
> **Filas BullMQ:** Upload (concorrência: 3) e Scan (concorrência: 1) via Redis

---

## Índice

1. [Autenticação (Públicas)](#1-autenticação-públicas)
2. [Sessões e Perfil](#2-sessões-e-perfil-protegidas)
3. [Biblioteca](#3-biblioteca)
4. [Discover (Carrosséis)](#4-discover-carrosséis)
5. [Categorias (Favoritos, Lendo, Histórico)](#5-categorias-favoritos-lendo-histórico)
6. [Leitor](#6-leitor)
7. [Progresso de Leitura](#7-progresso-de-leitura)
8. [Estatísticas do Usuário (Perfil Completo)](#8-estatísticas-do-usuário-perfil-completo)
9. [Upload](#9-upload)
10. [Jobs — Gerenciamento Unificado](#10-jobs--gerenciamento-unificado)
11. [Scan — Via Fila BullMQ](#11-scan--via-fila-bullmq)
12. [Admin — Gerenciamento de Séries](#12-admin--gerenciamento-de-séries)
13. [Admin — Gerenciamento de Capítulos (Mídias)](#13-admin--gerenciamento-de-capítulos-mídias)
14. [Admin — Gerenciamento de Páginas (MediaManager)](#14-admin--gerenciamento-de-páginas-mediamanager)
15. [Admin — Metadados Multi-Fonte](#15-admin--metadados-multi-fonte)
16. [Admin — Dashboard e Listagem](#16-admin--dashboard-e-listagem)
17. [Admin — IPs Bloqueados](#17-admin--ips-bloqueados)
18. [Admin — Gerenciamento de Usuários](#18-admin--gerenciamento-de-usuários)
19. [Admin — Aprovação de Conteúdo](#19-admin--aprovação-de-conteúdo)
20. [Editor — Minhas Submissões](#20-editor--minhas-submissões)
21. [Notificações](#21-notificações)
22. [Analytics (Estatísticas Detalhadas)](#22-analytics-estatísticas-detalhadas)

---

## 1. Autenticação (Públicas)

### `POST /register`

Cria nova conta de usuário.

**Body:**

```json
{
  "name": "Luiz Gabriel",
  "email": "luiz@email.com",
  "password": "minhasenha123"
}
```

**Validações:**

- `name`: 2–100 caracteres
- `email`: formato válido, máximo 254 caracteres
- `password`: mínimo 8 caracteres

**Response (201):**

```json
{
  "message": "Usuário criado com sucesso",
  "userId": "clxyz123..."
}
```

---

### `POST /login`

Autentica e retorna token JWT + dados do usuário.

**Body:**

```json
{
  "email": "luiz@email.com",
  "password": "minhasenha123"
}
```

**Response (200):**

```json
{
  "message": "Login realizado com sucesso",
  "user": {
    "id": "clxyz123...",
    "email": "luiz@email.com",
    "name": "Luiz Gabriel",
    "role": "USER"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

> **Segurança:** IPs com tentativas de login falhadas consecutivas são bloqueados automaticamente. Veja [Admin — IPs Bloqueados](#17-admin--ips-bloqueados).

---

### `GET /`

Health check — verifica se o servidor está online.

**Response:**

```json
{
  "status": "Online 🚀",
  "version": "1.0.0"
}
```

---

## 2. Sessões e Perfil (Protegidas)

### `GET /me`

Retorna dados do usuário autenticado.

**Response:**

```json
{
  "id": "clxyz123...",
  "name": "Luiz Gabriel",
  "email": "luiz@email.com",
  "role": "USER",
  "createdAt": "2026-01-15T10:00:00.000Z"
}
```

---

### `POST /logout`

Encerra a sessão atual (invalida o token).

**Response:**

```json
{ "message": "Logout realizado com sucesso" }
```

---

### `POST /logout-all`

Encerra **todas** as sessões do usuário em todos os dispositivos.

**Response:**

```json
{ "message": "Todas as sessões foram encerradas" }
```

---

### `GET /sessions`

Lista todas as sessões ativas do usuário.

**Response:**

```json
[
  {
    "id": "session_abc...",
    "ip": "192.168.1.10",
    "userAgent": "Mozilla/5.0...",
    "createdAt": "2026-03-01T10:00:00.000Z",
    "lastUsedAt": "2026-03-01T15:00:00.000Z",
    "isCurrent": true
  }
]
```

---

### `DELETE /sessions/:sessionId`

Revoga uma sessão específica (força logout daquele dispositivo).

**Response:**

```json
{ "message": "Sessão revogada com sucesso" }
```

---

## 3. Biblioteca

### `GET /series`

Lista todas as séries da biblioteca com seus capítulos.

**Response:**

```json
[
  {
    "id": "clxyz...",
    "title": "Asa Noturna",
    "description": "Dick Grayson retorna como Asa Noturna...",
    "author": "Tom Taylor",
    "artist": "Bruno Redondo",
    "status": "Ongoing",
    "tags": "Action, Superhero",
    "coverUrl": "/series/clxyz.../cover",
    "sourceType": "LOCAL",
    "createdAt": "2026-01-20T10:00:00.000Z",
    "updatedAt": "2026-02-28T14:00:00.000Z",
    "medias": [
      {
        "id": "media_abc...",
        "title": "Asa Noturna - Cap 21",
        "number": 21,
        "volume": null,
        "pageCount": 24,
        "createdAt": "2026-02-28T14:00:00.000Z"
      }
    ]
  }
]
```

---

### `GET /series/:id`

Detalhes completos de uma série com todos os capítulos.

**Response:** (mesmo formato de item em `/series`, com todos os capítulos)

---

### `GET /series/:id/cover`

Retorna a imagem de capa da série (binário).

**Response:** `image/jpeg` ou `image/webp` (binário)

> Retorna `404` se a série não tiver capa extraída.

---

## 4. Discover (Carrosséis)

### `GET /discover`

Retorna todos os carrosséis de descoberta de uma vez.

**Response:**

```json
{
  "recentlyAdded": [
    {
      "id": "clxyz...",
      "title": "Asa Noturna",
      "coverUrl": "/series/clxyz.../cover",
      "tags": "Action, Superhero",
      "status": "Ongoing",
      "chaptersCount": 8,
      "createdAt": "2026-02-28T14:00:00.000Z"
    }
  ],
  "recentlyUpdated": [],
  "mostViewed": []
}
```

---

### `GET /discover/recent`

Séries adicionadas recentemente.

**Query:** `?limit=10`

**Response:**

```json
[
  {
    "id": "clxyz...",
    "title": "Asa Noturna",
    "coverUrl": "/series/clxyz.../cover",
    "tags": "Action, Superhero",
    "status": "Ongoing",
    "chaptersCount": 8,
    "createdAt": "2026-02-28T14:00:00.000Z"
  }
]
```

---

### `GET /discover/updated`

Séries atualizadas recentemente (novos capítulos adicionados).

**Query:** `?limit=10`

**Response:**

```json
[
  {
    "id": "clxyz...",
    "title": "A Equipe Verde",
    "coverUrl": "/series/clxyz.../cover",
    "tags": "Action, Team",
    "status": "Completed",
    "chaptersCount": 8,
    "updatedAt": "2026-02-28T14:00:00.000Z"
  }
]
```

---

### `GET /discover/popular`

Séries mais vistas (ranking global por leitores únicos + releituras).

**Query:** `?limit=10`

**Response:**

```json
[
  {
    "id": "clxyz...",
    "title": "Asa Noturna",
    "coverUrl": "/series/clxyz.../cover",
    "tags": "Action, Superhero",
    "status": "Ongoing",
    "chaptersCount": 8,
    "uniqueReaders": 12,
    "totalReads": 45
  }
]
```

---

## 5. Categorias (Favoritos, Lendo, Histórico)

### `GET /favorites`

Lista séries favoritadas pelo usuário.

**Response:**

```json
[
  {
    "id": "item_abc...",
    "seriesId": "clxyz...",
    "addedAt": "2026-02-20T10:00:00.000Z",
    "series": {
      "id": "clxyz...",
      "title": "Asa Noturna",
      "coverUrl": "/series/clxyz.../cover"
    }
  }
]
```

---

### `GET /reading`

Lista séries na lista de leitura do usuário.

**Response:** (mesmo formato de `/favorites`)

---

### `GET /history`

Lista histórico de leitura do usuário.

**Response:** (mesmo formato de `/favorites`)

---

### `POST /favorites/toggle`

Adiciona ou remove uma série dos favoritos (toggle).

**Body:**

```json
{ "seriesId": "clxyz..." }
```

**Response:**

```json
{
  "message": "Adicionado aos favoritos",
  "isFavorite": true,
  "action": "added"
}
```

---

### `POST /reading/toggle`

Adiciona ou remove uma série da lista de leitura (toggle).

**Body:**

```json
{ "seriesId": "clxyz..." }
```

**Response:**

```json
{
  "message": "Adicionado à lista de leitura",
  "isReading": true,
  "action": "added"
}
```

---

### `GET /series-status/:seriesId`

Verifica em quais categorias uma série está para o usuário atual.

**Response:**

```json
{
  "seriesId": "clxyz...",
  "isFavorite": true,
  "isReading": true,
  "inHistory": true,
  "categories": [
    { "type": "FAVORITES" },
    { "type": "READING" },
    { "type": "HISTORY" }
  ]
}
```

---

## 6. Leitor

### `GET /read/:id/info`

Informações de um capítulo para o leitor, incluindo navegação entre capítulos.

**Response:**

```json
{
  "id": "media_abc...",
  "title": "Cap 21",
  "number": 21,
  "pageCount": 24,
  "series": {
    "id": "clxyz...",
    "title": "Asa Noturna"
  },
  "nextChapter": {
    "id": "media_def...",
    "number": 22
  },
  "prevChapter": {
    "id": "media_ghi...",
    "number": 20
  }
}
```

---

### `GET /read/:id/page/:page`

Retorna a imagem de uma página específica (binário).

**Parâmetros:**

- `:id` — ID da mídia (capítulo)
- `:page` — Número da página (1-indexed)

**Response:** `image/jpeg`, `image/png` ou `image/webp` (binário)

---

### `POST /read/:id/progress`

Atualiza o progresso de leitura do capítulo atual.

**Body:**

```json
{ "page": 15 }
```

**Validação:** `page` deve ser inteiro ≥ 0.

**Response:**

```json
{
  "success": true,
  "progress": {
    "id": "progress_abc...",
    "page": 15,
    "finished": false,
    "readCount": 1,
    "lastReadAt": "2026-03-01T15:30:00.000Z",
    "media": {
      "id": "media_abc...",
      "title": "Cap 21",
      "number": 21,
      "pageCount": 24,
      "series": {
        "id": "clxyz...",
        "title": "Asa Noturna",
        "coverPath": "/path/to/cover.jpg"
      }
    }
  }
}
```

---

## 7. Progresso de Leitura

### `GET /progress/:mediaId`

Busca progresso específico de um capítulo para o usuário atual.

**Response:**

```json
{
  "id": "progress_abc...",
  "userId": "clxyz123...",
  "mediaId": "media_abc...",
  "page": 15,
  "finished": false,
  "readCount": 1,
  "startedAt": "2026-03-01T10:00:00.000Z",
  "lastReadAt": "2026-03-01T15:30:00.000Z",
  "completedAt": null
}
```

**Erro:** `404` se não houver progresso registrado.

---

### `GET /progress/series/:seriesId`

Progresso completo de todos os capítulos de uma série.

**Response:**

```json
{
  "seriesId": "clxyz...",
  "totalChapters": 8,
  "chaptersRead": 5,
  "chaptersInProgress": 1,
  "progressPercent": 62,
  "chapters": [
    {
      "mediaId": "media_abc...",
      "number": 1,
      "title": "Cap 1",
      "page": 24,
      "pageCount": 24,
      "finished": true,
      "readCount": 2,
      "lastReadAt": "2026-02-20T10:00:00.000Z"
    }
  ]
}
```

---

### `GET /progress/continue-reading`

Últimos capítulos em progresso para carrossel "Continuar Lendo".

**Query:** `?limit=10&onlyInProgress=true`

| Parâmetro        | Tipo    | Padrão  | Descrição                                 |
| ---------------- | ------- | ------- | ----------------------------------------- |
| `limit`          | number  | 10      | Quantidade máxima de resultados           |
| `onlyInProgress` | boolean | `false` | Se `true`, exclui capítulos já concluídos |

**Response:**

```json
[
  {
    "id": "progress_abc...",
    "page": 15,
    "finished": false,
    "lastReadAt": "2026-03-01T15:30:00.000Z",
    "media": {
      "id": "media_abc...",
      "title": "Cap 21",
      "number": 21,
      "pageCount": 24,
      "series": {
        "id": "clxyz...",
        "title": "Asa Noturna",
        "coverPath": "/path/to/cover.jpg"
      }
    }
  }
]
```

---

### `GET /progress/stats`

Estatísticas básicas de leitura (legado — use `/user/stats` para versão completa).

**Response:**

```json
{
  "totalChaptersRead": 42,
  "totalPagesRead": 1050,
  "totalSeriesStarted": 5,
  "totalSeriesCompleted": 2,
  "averagePagesPerChapter": 25
}
```

---

### `GET /progress/history`

Histórico detalhado de leitura com paginação.

**Query:** `?limit=20&offset=0&onlyCompleted=false`

**Response:**

```json
{
  "items": [
    {
      "id": "progress_abc...",
      "page": 24,
      "finished": true,
      "readCount": 1,
      "startedAt": "2026-03-01T10:00:00.000Z",
      "lastReadAt": "2026-03-01T15:30:00.000Z",
      "completedAt": "2026-03-01T15:30:00.000Z",
      "media": {
        "id": "media_abc...",
        "title": "Cap 21",
        "number": 21,
        "pageCount": 24,
        "series": {
          "id": "clxyz...",
          "title": "Asa Noturna"
        }
      }
    }
  ],
  "total": 42,
  "hasMore": true
}
```

---

### `GET /progress/series-list`

Lista séries com progresso do usuário (resumo por série).

**Response:**

```json
[
  {
    "seriesId": "clxyz...",
    "title": "Asa Noturna",
    "coverUrl": "/series/clxyz.../cover",
    "totalChapters": 8,
    "chaptersRead": 5,
    "progressPercent": 62,
    "lastReadAt": "2026-03-01T15:30:00.000Z"
  }
]
```

---

### `POST /progress/:mediaId/mark-read`

Marca um capítulo como completamente lido (define `finished: true` e `page: pageCount`).

**Response (201):**

```json
{
  "id": "progress_abc...",
  "page": 24,
  "finished": true,
  "readCount": 1,
  "completedAt": "2026-03-01T15:30:00.000Z"
}
```

---

### `DELETE /progress/:mediaId`

Reseta progresso de um capítulo (marca como não lido).

**Response:**

```json
{ "message": "Progresso removido" }
```

---

### `POST /progress/series/:seriesId/mark-all-read`

Marca **todos** os capítulos da série como lidos de uma vez.

**Response:**

```json
{
  "message": "Série marcada como lida",
  "chaptersMarked": 8
}
```

---

### `DELETE /progress/series/:seriesId`

Reseta progresso de **todos** os capítulos de uma série.

**Response:**

```json
{
  "message": "Progresso da série resetado",
  "chaptersReset": 8
}
```

---

## 8. Estatísticas do Usuário (Perfil Completo)

### `GET /user/stats`

Perfil completo de estatísticas do usuário (todos os módulos de uma vez).

**Response:**

```json
{
  "reading": {
    "chaptersRead": 42,
    "chaptersInProgress": 3,
    "totalChaptersTouched": 45,
    "totalPagesRead": 1050,
    "totalRereads": 5,
    "seriesStarted": 8,
    "seriesCompleted": 3,
    "completionRate": 93,
    "avgPagesPerChapter": 25
  },
  "library": {
    "totalSeriesInLibrary": 15,
    "totalChaptersInLibrary": 120,
    "totalPagesInLibrary": 3000,
    "seriesExplored": 8,
    "chaptersExplored": 45,
    "libraryExploredPercent": 53,
    "favorites": 4,
    "reading": 2,
    "history": 10
  },
  "streaks": {
    "currentStreak": 5,
    "longestStreak": 14,
    "totalActiveDays": 30,
    "isActiveToday": true
  },
  "time": {
    "totalTimeSeconds": 86400,
    "totalTimeFormatted": "24h 0m",
    "avgTimePerDaySeconds": 2880,
    "avgTimePerDayFormatted": "48m",
    "totalPagesReadFromStats": 1050,
    "avgPagesPerDay": 35,
    "totalChaptersCompleted": 42,
    "avgChaptersPerDay": 1.4,
    "mostProductiveDay": "Sábado",
    "pagesPerDayOfWeek": [
      { "day": "Domingo", "pages": 120, "time": 7200 },
      { "day": "Segunda", "pages": 80, "time": 4800 },
      { "day": "Terça", "pages": 90, "time": 5400 },
      { "day": "Quarta", "pages": 100, "time": 6000 },
      { "day": "Quinta", "pages": 110, "time": 6600 },
      { "day": "Sexta", "pages": 200, "time": 12000 },
      { "day": "Sábado", "pages": 350, "time": 21000 }
    ],
    "memberSinceDays": 45
  },
  "genres": {
    "favoriteGenre": "Action",
    "topGenres": [
      { "tag": "Action", "count": 30, "percent": 35 },
      { "tag": "Superhero", "count": 20, "percent": 23 },
      { "tag": "Drama", "count": 15, "percent": 17 }
    ],
    "allGenres": [{ "tag": "Action", "count": 30, "percent": 35 }],
    "totalGenresExplored": 8
  },
  "topSeries": [
    {
      "id": "clxyz...",
      "title": "Asa Noturna",
      "coverUrl": "/series/clxyz.../cover",
      "tags": "Action, Superhero",
      "totalChapters": 8,
      "chaptersRead": 8,
      "pagesRead": 200,
      "rereads": 2,
      "progressPercent": 100,
      "lastReadAt": "2026-03-01T15:30:00.000Z"
    }
  ],
  "milestones": {
    "total": 27,
    "achieved": 8,
    "next": {
      "id": "chapters_50",
      "category": "chapters",
      "title": "50 capítulos lidos",
      "target": 50,
      "current": 42,
      "achieved": false,
      "percent": 84
    },
    "all": [
      {
        "id": "chapters_1",
        "category": "chapters",
        "title": "1 capítulo lido",
        "target": 1,
        "current": 42,
        "achieved": true,
        "percent": 100
      }
    ]
  }
}
```

---

### `GET /user/stats/reading`

Apenas estatísticas de leitura.

**Response:**

```json
{
  "chaptersRead": 42,
  "chaptersInProgress": 3,
  "totalChaptersTouched": 45,
  "totalPagesRead": 1050,
  "totalRereads": 5,
  "seriesStarted": 8,
  "seriesCompleted": 3,
  "completionRate": 93,
  "avgPagesPerChapter": 25
}
```

---

### `GET /user/stats/library`

Estatísticas da biblioteca do usuário.

**Response:**

```json
{
  "totalSeriesInLibrary": 15,
  "totalChaptersInLibrary": 120,
  "totalPagesInLibrary": 3000,
  "seriesExplored": 8,
  "chaptersExplored": 45,
  "libraryExploredPercent": 53,
  "favorites": 4,
  "reading": 2,
  "history": 10
}
```

---

### `GET /user/stats/streaks`

Sequências de leitura consecutivas.

**Response:**

```json
{
  "currentStreak": 5,
  "longestStreak": 14,
  "totalActiveDays": 30,
  "isActiveToday": true
}
```

---

### `GET /user/stats/time`

Estatísticas de tempo detalhadas com análise por dia da semana.

**Response:**

```json
{
  "totalTimeSeconds": 86400,
  "totalTimeFormatted": "24h 0m",
  "avgTimePerDaySeconds": 2880,
  "avgTimePerDayFormatted": "48m",
  "totalPagesReadFromStats": 1050,
  "avgPagesPerDay": 35,
  "totalChaptersCompleted": 42,
  "avgChaptersPerDay": 1.4,
  "mostProductiveDay": "Sábado",
  "pagesPerDayOfWeek": [
    { "day": "Domingo", "pages": 120, "time": 7200 },
    { "day": "Segunda", "pages": 80, "time": 4800 },
    { "day": "Terça", "pages": 90, "time": 5400 },
    { "day": "Quarta", "pages": 100, "time": 6000 },
    { "day": "Quinta", "pages": 110, "time": 6600 },
    { "day": "Sexta", "pages": 200, "time": 12000 },
    { "day": "Sábado", "pages": 350, "time": 21000 }
  ],
  "memberSinceDays": 45
}
```

---

### `GET /user/stats/genres`

Distribuição de gêneros lidos pelo usuário.

**Response:**

```json
{
  "favoriteGenre": "Action",
  "topGenres": [
    { "tag": "Action", "count": 30, "percent": 35 },
    { "tag": "Superhero", "count": 20, "percent": 23 },
    { "tag": "Drama", "count": 15, "percent": 17 },
    { "tag": "Fantasy", "count": 10, "percent": 12 },
    { "tag": "Comedy", "count": 8, "percent": 9 }
  ],
  "allGenres": [{ "tag": "Action", "count": 30, "percent": 35 }],
  "totalGenresExplored": 8
}
```

---

### `GET /user/stats/milestones`

Conquistas e milestones do usuário.

**Categorias de milestones:** `chapters`, `pages`, `series`, `streak`

**Response:**

```json
{
  "total": 27,
  "achieved": 8,
  "next": {
    "id": "chapters_50",
    "category": "chapters",
    "title": "50 capítulos lidos",
    "target": 50,
    "current": 42,
    "achieved": false,
    "percent": 84
  },
  "all": [
    {
      "id": "chapters_1",
      "category": "chapters",
      "title": "1 capítulo lido",
      "target": 1,
      "current": 42,
      "achieved": true,
      "percent": 100
    },
    {
      "id": "pages_1000",
      "category": "pages",
      "title": "1.000 páginas lidas",
      "target": 1000,
      "current": 1050,
      "achieved": true,
      "percent": 100
    },
    {
      "id": "streak_7",
      "category": "streak",
      "title": "7 dias consecutivos lendo",
      "target": 7,
      "current": 14,
      "achieved": true,
      "percent": 100
    }
  ]
}
```

---

## 9. Upload

### `POST /upload`

Upload de arquivo único (CBZ/CBR/PDF/EPUB). Multipart form-data.

> **Pipeline:** Upload → Validação MIME → Hash SHA-256 → Dedup por hash → Fila BullMQ → Otimização → Registro → Enriquecimento → Cover

**Body:** `multipart/form-data` com campo `file`

**Tipos aceitos:** `.cbz`, `.cbr`, `.pdf`, `.epub`, `.zip`
**Tamanho máximo:** 100MB (configurável via `FILE_UPLOAD_LIMIT`)
**Validação:** Por magic numbers (primeiros bytes), não pela extensão do arquivo.

**Response (200):**

```json
{
  "success": true,
  "message": "Upload recebido! Processamento iniciado em background.",
  "jobId": "abc123...",
  "filename": "Asa Noturna - Cap 21.cbz"
}
```

**Erros possíveis:**

| Status | Motivo                                     |
| ------ | ------------------------------------------ |
| 400    | Nenhum arquivo enviado                     |
| 400    | Tipo de arquivo não permitido (MIME check) |
| 400    | Arquivo inválido ou corrompido             |
| 409    | Arquivo duplicado (mesmo hash SHA-256)     |
| 413    | Arquivo muito grande (> 100MB)             |
| 500    | Erro interno no processamento              |

---

### `POST /upload/bulk`

Upload de múltiplos arquivos em lote. Cada arquivo válido vira um job independente na fila BullMQ.

**Body:** `multipart/form-data` com campo `files` (múltiplos)

**Validação por arquivo:** MIME check via magic numbers, tamanho individual e dedup por hash SHA-256.

**Response (202):**

```json
{
  "success": true,
  "message": "3 arquivo(s) recebido(s)! Processamento iniciado em background.",
  "accepted": [
    { "filename": "Cap1.cbz", "jobId": "abc..." },
    { "filename": "Cap2.cbz", "jobId": "def..." },
    { "filename": "Cap3.cbz", "jobId": "ghi..." }
  ],
  "rejected": [
    {
      "filename": "readme.txt",
      "reason": "Tipo de arquivo não permitido. Aceitos: .cbz, .cbr, .pdf, .epub, .zip"
    },
    {
      "filename": "Cap1-copia.cbz",
      "reason": "Arquivo duplicado (mesmo hash de Cap1.cbz)"
    }
  ]
}
```

---

### `POST /upload/folder`

Upload de pasta — envia múltiplos arquivos e define o nome da série a partir do nome da pasta. Ideal para enviar uma série inteira organizada por pasta.

**Body:** `multipart/form-data`

| Campo        | Tipo     | Obrigatório | Descrição                                                            |
| ------------ | -------- | ----------- | -------------------------------------------------------------------- |
| `folderName` | `string` | Sim         | Nome da pasta (vira o título da série). Deve vir antes dos arquivos. |
| `files`      | `file[]` | Sim         | Arquivos da pasta (CBZ/CBR/PDF/EPUB). Máx. 50 por request.           |

> O `folderName` é normalizado via `normalizeSeriesTitle()` (remove grupos de scan, tags, aplica Title Case). Se já existir uma série com título similar no banco, os capítulos são associados a ela via SeriesResolver.

**Exemplo de uso (cURL):**

```bash
curl -X POST http://localhost:3000/upload/folder \
  -H "Authorization: Bearer <token>" \
  -F "folderName=Asa Noturna" \
  -F "files=@Cap1.cbz" \
  -F "files=@Cap2.cbz" \
  -F "files=@Cap3.cbz"
```

**Response (202):**

```json
{
  "success": true,
  "message": "3 arquivo(s) da pasta \"Asa Noturna\" recebido(s)! Processamento iniciado em background.",
  "folderName": "Asa Noturna",
  "seriesTitle": "Asa Noturna",
  "accepted": [
    {
      "filename": "Cap1.cbz",
      "jobId": "abc...",
      "size": 52428800,
      "hash": "a1b2c3..."
    },
    {
      "filename": "Cap2.cbz",
      "jobId": "def...",
      "size": 48234567,
      "hash": "d4e5f6..."
    },
    {
      "filename": "Cap3.cbz",
      "jobId": "ghi...",
      "size": 51234567,
      "hash": "g7h8i9..."
    }
  ],
  "rejected": [],
  "totalReceived": 3
}
```

**Erros possíveis:**

| Status | Motivo                                   |
| ------ | ---------------------------------------- |
| 400    | Campo `folderName` ausente               |
| 400    | Nenhum arquivo enviado                   |
| 400    | Nenhum arquivo válido (todos rejeitados) |

---

### `POST /upload/series/:seriesId`

Upload direto em uma série existente — os arquivos são associados diretamente à série informada, pulando a resolução de título. Ideal para lançamentos ou adição de novos capítulos a uma série já catalogada.

**Parâmetro:** `:seriesId` — ID da série de destino

**Body:** `multipart/form-data` com campo `files` (um ou mais arquivos)

**Comportamento:**

- O SeriesResolver é **pulado** — o título da série vem direto do banco
- O Optimizer usa o título da série existente para organizar arquivos na pasta correta
- O parser ainda extrai capítulo/volume/ano do nome do arquivo
- Dedup por hash SHA-256 e MIME check continuam ativos

**Exemplo de uso (cURL):**

```bash
# Upload de um capítulo
curl -X POST http://localhost:3000/upload/series/clxyz123... \
  -H "Authorization: Bearer <token>" \
  -F "files=@Cap22.cbz"

# Upload de múltiplos capítulos
curl -X POST http://localhost:3000/upload/series/clxyz123... \
  -H "Authorization: Bearer <token>" \
  -F "files=@Cap22.cbz" \
  -F "files=@Cap23.cbz"
```

**Response — arquivo único (200):**

```json
{
  "success": true,
  "message": "Upload recebido para \"Asa Noturna\"! Processamento iniciado em background.",
  "seriesId": "clxyz123...",
  "seriesTitle": "Asa Noturna",
  "jobId": "abc123...",
  "filename": "Cap22.cbz"
}
```

**Response — múltiplos arquivos (202):**

```json
{
  "success": true,
  "message": "2 arquivo(s) recebido(s) para \"Asa Noturna\"! Processamento iniciado em background.",
  "seriesId": "clxyz123...",
  "seriesTitle": "Asa Noturna",
  "accepted": [
    {
      "filename": "Cap22.cbz",
      "jobId": "abc...",
      "size": 52428800,
      "hash": "a1b2c3..."
    },
    {
      "filename": "Cap23.cbz",
      "jobId": "def...",
      "size": 48234567,
      "hash": "d4e5f6..."
    }
  ],
  "rejected": [],
  "totalReceived": 2
}
```

**Erros possíveis:**

| Status | Motivo                                   |
| ------ | ---------------------------------------- |
| 400    | Nenhum arquivo enviado                   |
| 400    | Nenhum arquivo válido (todos rejeitados) |
| 404    | Série não encontrada                     |

---

### Pipeline de Processamento (Worker)

O worker BullMQ processa uploads nas seguintes etapas:

| Progresso | Etapa                                                                                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 5%        | **Resolução de título** — SeriesResolver com fuzzy matching (5 estratégias). **Pulado** quando `targetSeriesId` ou `forcedSeriesTitle` são fornecidos (upload de pasta / direto em série). |
| 10%       | **Detecção de duplicatas** — Verifica série + capítulo no banco                                                                                                                            |
| 15%       | **Otimização** — Conversão WebP, redimensionamento, compressão                                                                                                                             |
| 60%       | **Registro** — Scan do arquivo, parser, metadados, banco de dados                                                                                                                          |
| 80%       | **Cover** — Extração/regeneração de capa da série                                                                                                                                          |
| 100%      | **Completo** — Notificação enviada                                                                                                                                                         |

> **Upload de pasta** (`POST /upload/folder`): O `forcedSeriesTitle` é definido a partir do `folderName`. O SeriesResolver ainda tenta encontrar série existente com título similar, mas usa o título da pasta como base.
>
> **Upload direto** (`POST /upload/series/:seriesId`): O `targetSeriesId` é passado diretamente. O worker busca a série no banco e usa seu título, pulando completamente o resolver.

**Pipeline de resolução de nomes (SeriesResolver):**

1. **MetadataExtractor** — Lê metadados internos (ComicInfo.xml para CBZ/CBR, OPF para EPUB, metadata PDF)
2. **Parser (regex)** — Extrai título, capítulo, volume, ano do nome do arquivo. Remove automaticamente 80+ nomes de grupos de scan (archivecomicsbr, AHQ-SQ, LuCaZ, Viz, Mangastream, NdranghEta DecKArte, etc.)
3. **stripTrailingScanGroupWords()** — Heurística avançada: detecta CamelCase interior, siglas adjacentes e palavras de dicionário para limpar nomes residuais de scanlators
4. **normalizeSeriesTitle()** — Remove colchetes, tags de formato (digital, webrip, c2c), hashes, UUIDs, aplica Title Case
5. **SeriesResolver (5 estratégias)** — Busca no banco: exact match, prefix tokens, substring, Levenshtein (≤2), Jaccard (≥0.6)
6. **AI Scanner (fallback)** — Se título ainda inválido, usa IA para interpretar
7. **AniList (validação)** — Busca na AniList para validar/corrigir título oficial
8. **Auto-limpeza** — Se título novo é mais limpo que o existente no banco, atualiza automaticamente

**Exemplos de parsing:**

| Arquivo original                                        | Título limpo      | Cap  | Vol | Ano  |
| ------------------------------------------------------- | ----------------- | ---- | --- | ---- |
| `A Equipe Verde archivecomicsbr - Cap 1.cbz`            | A Equipe Verde    | 1    | —   | —    |
| `CapAmer#01.Vol12(2025)(AHQ-SQ).cbr`                    | Captain America   | 1    | 12  | 2025 |
| `One Piece - Chapter 1089 (2023) (Digital) (LuCaZ).cbz` | One Piece         | 1089 | —   | 2023 |
| `Dragon Ball Super v01 c001 [Viz].cbz`                  | Dragon Ball Super | 1    | 1   | —    |
| `Naruto_Shippuden_-_v45_c421_[Mangastream].cbz`         | Naruto Shippuden  | 421  | 45  | —    |
| `[HorribleSubs] Attack on Titan - S03E01.cbz`           | Attack On Titan   | 1    | —   | —    |
| `Batman (2016) - 001 (Digital) (Zone-Empire).cbz`       | Batman            | 1    | —   | 2016 |
| `Crossed Ndrangheta DecKArte - Cap 5.cbz`               | Crossed           | 5    | —   | —    |

---

## 10. Jobs — Gerenciamento Unificado

> **Arquitetura:** Todos os jobs (upload e scan) são processados via **BullMQ** com Redis. O `JobController` centraliza monitoramento, controle e gerenciamento de ambas as filas.

### Formato Unificado de Job (JobResponse)

Todos os endpoints de job retornam objetos neste formato:

```typescript
interface JobResponse {
  id: string; // ID único do job
  name: string; // Nome: "upload-NomeArquivo.cbz" ou "scan-library"
  queue: "uploads" | "scans"; // Qual fila
  state: string; // "waiting" | "active" | "completed" | "failed" | "delayed"
  data: {
    safeName?: string; // Nome sanitizado do arquivo (uploads)
    originalName?: string; // Nome original ou libraryPath (scans)
    userId?: string; // ID do usuário que iniciou
  };
  progress: number | object; // Porcentagem ou objeto de progresso
  result: any; // Resultado (quando completed)
  error: string | null; // Mensagem de erro (quando failed)
  logs?: string[]; // Logs de processamento
  attempts: number; // Tentativas feitas
  maxAttempts: number; // Máximo de tentativas (3)
  createdAt: number; // Timestamp de criação (ms)
  processedAt: number | null; // Timestamp de início de processamento
  finishedAt: number | null; // Timestamp de conclusão
  duration: number | null; // Duração em ms (finishedAt - processedAt)
  stacktrace?: string[]; // Stack trace (quando failed, para debug)
}
```

---

### `GET /jobs`

Lista jobs de upload com filtros por estado. Sem filtro retorna **todos** os estados.

**Query:** `?active=true` | `?completed=true` | `?failed=true`

**Response (sem filtro):**

```json
{
  "success": true,
  "stats": {
    "queue": "uploads",
    "waiting": 2,
    "active": 1,
    "completed": 15,
    "failed": 0,
    "delayed": 0,
    "total": 18,
    "paused": false
  },
  "jobs": [
    {
      "id": "abc123...",
      "name": "upload-Asa Noturna - Cap 21.cbz",
      "queue": "uploads",
      "state": "completed",
      "data": {
        "safeName": "Asa Noturna - Cap 21.cbz",
        "originalName": "Asa Noturna - Cap 21.cbz",
        "userId": "clxyz123..."
      },
      "progress": 100,
      "result": {
        "seriesTitle": "Asa Noturna",
        "chapter": 21,
        "finalPath": "/library_data/Asa Noturna/Asa Noturna - Cap 21.cbz",
        "stats": {
          "originalSize": 52428800,
          "optimizedSize": 31457280,
          "filesProcessed": 24,
          "filesConverted": 20,
          "filesSkipped": 4,
          "conversionTime": 3200,
          "compressionRatio": 40.0
        }
      },
      "error": null,
      "attempts": 1,
      "maxAttempts": 3,
      "createdAt": 1709305200000,
      "processedAt": 1709305210000,
      "finishedAt": 1709305320000,
      "duration": 110000
    }
  ]
}
```

**Response (`?failed=true`):**

```json
{
  "success": true,
  "stats": {
    "queue": "uploads",
    "waiting": 0,
    "active": 0,
    "completed": 0,
    "failed": 1,
    "delayed": 0,
    "total": 1,
    "paused": false
  },
  "jobs": [
    {
      "id": "xyz789...",
      "name": "upload-corrupted.cbz",
      "queue": "uploads",
      "state": "failed",
      "data": { "safeName": "corrupted.cbz", "originalName": "corrupted.cbz" },
      "progress": 15,
      "result": null,
      "error": "O arquivo parece ser um ZIP, mas está corrompido.",
      "attempts": 3,
      "maxAttempts": 3,
      "createdAt": 1709305200000,
      "processedAt": 1709305210000,
      "finishedAt": 1709306000000,
      "duration": 790000,
      "stacktrace": [
        "Error: O arquivo parece ser um ZIP, mas está corrompido.\n    at ..."
      ]
    }
  ]
}
```

---

### `GET /jobs/stats`

Estatísticas detalhadas de **todas** as filas (uploads + scans) em uma chamada.

**Response:**

```json
{
  "success": true,
  "uploads": {
    "queue": "uploads",
    "waiting": 2,
    "active": 1,
    "completed": 15,
    "failed": 0,
    "delayed": 0,
    "total": 18,
    "paused": false
  },
  "scans": {
    "queue": "scans",
    "waiting": 0,
    "active": 1,
    "completed": 5,
    "failed": 0,
    "total": 6,
    "paused": false
  },
  "global": {
    "totalActive": 2,
    "totalWaiting": 2,
    "totalFailed": 0,
    "totalCompleted": 20
  }
}
```

---

### `GET /jobs/:jobId`

Status detalhado de um job específico. Busca automaticamente em ambas as filas (upload e scan).

**Response (200):**

```json
{
  "success": true,
  "job": {
    "id": "abc123...",
    "name": "upload-Asa Noturna - Cap 21.cbz",
    "queue": "uploads",
    "state": "completed",
    "data": {
      "safeName": "Asa Noturna - Cap 21.cbz",
      "originalName": "Asa Noturna - Cap 21.cbz"
    },
    "progress": 100,
    "result": {
      "seriesTitle": "Asa Noturna",
      "chapter": 21,
      "finalPath": "/library_data/Asa Noturna/Asa Noturna - Cap 21.cbz",
      "stats": {
        "originalSize": 52428800,
        "optimizedSize": 31457280,
        "filesProcessed": 24,
        "filesConverted": 20,
        "filesSkipped": 4,
        "conversionTime": 3200,
        "compressionRatio": 40.0
      }
    },
    "error": null,
    "logs": [
      "Otimizando: Asa Noturna - Cap 21.cbz",
      "Registrando no banco: /library_data/Asa Noturna/...",
      "Extraindo cover..."
    ],
    "attempts": 1,
    "maxAttempts": 3,
    "createdAt": 1709305200000,
    "processedAt": 1709305210000,
    "finishedAt": 1709305320000,
    "duration": 110000
  }
}
```

**Response — Job duplicado detectado:**

```json
{
  "success": true,
  "job": {
    "id": "def456...",
    "name": "upload-Asa Noturna - Cap 21.cbz",
    "queue": "uploads",
    "state": "completed",
    "progress": 100,
    "result": {
      "seriesTitle": "Asa Noturna",
      "chapter": 21,
      "finalPath": "/library_data/Asa Noturna/...",
      "duplicate": true
    },
    "error": null,
    "duration": 1000
  }
}
```

**Erro:** `404` se job não encontrado em nenhuma fila.

---

### `GET /jobs/:jobId/logs`

Logs de processamento de um job específico (busca em ambas as filas).

**Response (200):**

```json
{
  "success": true,
  "jobId": "abc123...",
  "logs": [
    "Otimizando: Asa Noturna - Cap 21.cbz",
    "Registrando no banco: /library_data/Asa Noturna/...",
    "Extraindo cover..."
  ],
  "count": 3
}
```

---

### `POST /jobs/:jobId/retry`

Reenfileira um job falhado para nova tentativa. Só funciona com jobs em estado `failed`.

**Response (200):**

```json
{
  "success": true,
  "message": "Job abc123... reenfileirado para retry"
}
```

**Erro (404):**

```json
{ "error": "Job não encontrado ou não está em estado 'failed'" }
```

---

### `POST /jobs/retry-all`

Reenfileira **todos** os jobs falhados de ambas as filas.

**Response (200):**

```json
{
  "success": true,
  "message": "5 job(s) reenfileirado(s) para retry",
  "retried": 5,
  "failed": 0
}
```

---

### `DELETE /jobs/:jobId`

Cancela/remove um job. Funciona com jobs em estado `waiting`, `delayed` ou `failed`. Jobs `active` não podem ser cancelados.

**Response (200):**

```json
{ "success": true, "message": "Job removido da fila" }
```

**Erro (400):**

```json
{ "error": "Job está ativo e não pode ser removido" }
```

---

### `DELETE /jobs/completed`

Limpa jobs antigos de ambas as filas.

> **Regras de limpeza:**
>
> - Uploads completados > 1h (mantém últimos 100)
> - Uploads falhados > 24h (mantém últimos 50)
> - Scans completados > 1h (mantém últimos 10)
> - Scans falhados > 24h (mantém últimos 5)

**Response (200):**

```json
{ "success": true, "message": "Jobs antigos removidos" }
```

---

### `POST /jobs/pause`

Pausa a fila de uploads. Jobs ativos terminam, mas novos jobs não serão processados.

**Response (200):**

```json
{
  "success": true,
  "message": "Fila de uploads pausada",
  "stats": {
    "queue": "uploads",
    "waiting": 5,
    "active": 0,
    "completed": 15,
    "failed": 0,
    "delayed": 0,
    "total": 20,
    "paused": true
  }
}
```

---

### `POST /jobs/resume`

Retoma a fila de uploads pausada.

**Response (200):**

```json
{
  "success": true,
  "message": "Fila de uploads retomada",
  "stats": {
    "queue": "uploads",
    "waiting": 5,
    "active": 1,
    "completed": 15,
    "failed": 0,
    "delayed": 0,
    "total": 21,
    "paused": false
  }
}
```

---

### `POST /jobs/drain`

Remove **todos** os jobs em espera da fila de uploads e limpa arquivos temporários associados.

> **Atenção:** Ação irreversível. Jobs ativos continuam, mas todos os pendentes são descartados.

**Response (200):**

```json
{
  "success": true,
  "message": "3 job(s) em espera removido(s)",
  "removed": 3,
  "tempFilesClean": 3
}
```

---

### `GET /jobs/progress/stream`

**Server-Sent Events (SSE)** — Stream em tempo real do progresso de **todos** os jobs (uploads + scans).

**Headers de resposta:**

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Eventos emitidos:**

| Evento    | Campo `type` | Campo `queue`       | Descrição                        |
| --------- | ------------ | ------------------- | -------------------------------- |
| Snapshot  | `snapshot`   | —                   | Estado inicial ao conectar       |
| Progresso | `progress`   | `uploads` / `scans` | Atualização de % do job          |
| Concluído | `completed`  | `uploads` / `scans` | Job finalizado com sucesso       |
| Falhado   | `failed`     | `uploads` / `scans` | Job falhou                       |
| Stalled   | `stalled`    | `uploads`           | Job travado (possível crash)     |
| Heartbeat | (comentário) | —                   | `: heartbeat` a cada 15 segundos |

**Exemplo de eventos:**

```
data: {"type":"snapshot","stats":{"uploads":{...},"scans":{...},"global":{...}},"jobs":[]}

data: {"type":"progress","queue":"uploads","jobId":"abc123","progress":60}

data: {"type":"completed","queue":"uploads","jobId":"abc123","result":{"seriesTitle":"Asa Noturna","chapter":21}}

data: {"type":"failed","queue":"uploads","jobId":"xyz789","error":"Arquivo corrompido"}

data: {"type":"progress","queue":"scans","jobId":"scan1","progress":{"current":5,"total":20,"percent":25}}

data: {"type":"completed","queue":"scans","jobId":"scan1","result":{"processed":20,"errors":[]}}

: heartbeat
```

**Uso no frontend:**

```javascript
const evtSource = new EventSource("/jobs/progress/stream", {
  headers: { Authorization: `Bearer ${token}` },
});

evtSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  switch (data.type) {
    case "snapshot":
      /* estado inicial */ break;
    case "progress":
      /* atualizar barra */ break;
    case "completed":
      /* toast de sucesso */ break;
    case "failed":
      /* toast de erro */ break;
    case "stalled":
      /* alerta */ break;
  }
};
```

---

## 11. Scan — Via Fila BullMQ

> O scan processa arquivos do diretório `LIBRARY_PATH` configurado. Cada scan é um job BullMQ na fila `scans` (concorrência: 1). Não é possível iniciar dois scans simultaneamente — tentativa retorna `409`.

### `POST /scan`

Inicia scan da biblioteca em background via BullMQ.

**Query:** `?incremental=true` — Scan incremental (só processa arquivos novos). Sem query = scan completo.

**Response (200):**

```json
{
  "success": true,
  "message": "Scan completo iniciado em background",
  "jobId": "scan_abc123..."
}
```

**Response (409) — Scan já em andamento:**

```json
{
  "error": "Scan já em andamento ou agendado",
  "message": "Aguarde o scan atual terminar antes de iniciar outro."
}
```

---

### `GET /scan/jobs`

Lista todos os jobs de scan (histórico + ativos).

**Response:**

```json
{
  "success": true,
  "stats": {
    "queue": "scans",
    "waiting": 0,
    "active": 0,
    "completed": 3,
    "failed": 0,
    "total": 3,
    "paused": false
  },
  "jobs": [
    {
      "id": "scan_abc...",
      "name": "scan-library",
      "queue": "scans",
      "state": "completed",
      "data": {
        "originalName": "/library_data",
        "userId": "clxyz123..."
      },
      "progress": 100,
      "result": {
        "processed": 20,
        "added": 5,
        "skipped": 15,
        "errors": []
      },
      "error": null,
      "attempts": 1,
      "maxAttempts": 3,
      "createdAt": 1709305200000,
      "processedAt": 1709305210000,
      "finishedAt": 1709305500000,
      "duration": 290000
    }
  ]
}
```

---

### `GET /scan/jobs/:jobId`

Status detalhado de um job de scan específico.

**Response (200):**

```json
{
  "success": true,
  "job": {
    "id": "scan_abc...",
    "name": "scan-library",
    "queue": "scans",
    "state": "active",
    "data": {
      "originalName": "/library_data",
      "userId": "clxyz123..."
    },
    "progress": { "current": 12, "total": 20, "percent": 60 },
    "result": null,
    "error": null,
    "attempts": 1,
    "maxAttempts": 3,
    "createdAt": 1709305200000,
    "processedAt": 1709305210000,
    "finishedAt": null,
    "duration": null
  }
}
```

---

## 12. Admin — Gerenciamento de Séries

### `PUT /admin/series/:id`

Edita metadados de uma série. Todos os campos são opcionais.

**Body:**

```json
{
  "title": "Asa Noturna (Rebirth)",
  "description": "Dick Grayson retorna como Asa Noturna...",
  "author": "Tom Taylor",
  "artist": "Bruno Redondo",
  "status": "Ongoing",
  "tags": "Action, Superhero, Drama"
}
```

**Response:**

```json
{
  "success": true,
  "series": {
    "id": "clxyz...",
    "title": "Asa Noturna (Rebirth)",
    "description": "Dick Grayson retorna como Asa Noturna...",
    "author": "Tom Taylor",
    "artist": "Bruno Redondo",
    "status": "Ongoing",
    "tags": "Action, Superhero, Drama",
    "coverPath": "/path/to/cover.jpg",
    "coverUrl": null,
    "sourceType": "LOCAL",
    "createdAt": "2026-01-20T10:00:00.000Z",
    "updatedAt": "2026-03-01T16:00:00.000Z"
  }
}
```

---

### `DELETE /admin/series/:id`

Deleta uma série e todos os seus capítulos, com limpeza completa de disco.

**Query:** `?deleteFiles=true` (padrão: `true`) — Se `false`, mantém arquivos no disco e só deleta do banco.

> **Cleanup automático:** Exclui todos os CBZ dos capítulos, cover da série, e remove a pasta da série se ficar vazia.

**Response:**

```json
{
  "success": true,
  "message": "Série \"Asa Noturna\" deletada",
  "details": {
    "chaptersDeleted": 8,
    "filesDeleted": 8,
    "coverDeleted": true,
    "errors": []
  }
}
```

---

### `POST /admin/series/bulk-delete`

Deleta múltiplas séries de uma vez (para uso no dashboard admin).

**Body:**

```json
{
  "seriesIds": ["clxyz123...", "clxyz456..."],
  "deleteFiles": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "2 série(s) deletada(s)",
  "details": {
    "totalSeriesDeleted": 2,
    "totalChaptersDeleted": 15,
    "totalFilesDeleted": 15,
    "results": [
      { "id": "clxyz123...", "title": "Asa Noturna", "success": true },
      { "id": "clxyz456...", "title": "Batman", "success": true }
    ]
  }
}
```

> **Erro parcial:** Se alguma série falhar, o item terá `success: false` com campo `error`. As demais são processadas normalmente.

---

### `POST /admin/series/merge`

Mescla duas séries — move todos os capítulos da série de origem para a série de destino.

**Body:**

```json
{
  "sourceSeriesId": "clxyz111...",
  "targetSeriesId": "clxyz222...",
  "deleteSource": true
}
```

**Validação:** `sourceSeriesId` e `targetSeriesId` não podem ser iguais.

**Response:**

```json
{
  "success": true,
  "message": "8 capítulos movidos de \"Equipe Verde\" para \"A Equipe Verde\"",
  "movedCount": 8,
  "sourceDeleted": true,
  "target": {
    "id": "clxyz222...",
    "title": "A Equipe Verde"
  }
}
```

> Use `deleteSource: false` para manter a série de origem (vazia) após a mesclagem.

---

## 13. Admin — Gerenciamento de Capítulos (Mídias)

### `DELETE /admin/media/:id`

Deleta um capítulo específico, com limpeza de arquivo no disco.

**Query:** `?deleteFile=true` (padrão: `true`)

**Response:**

```json
{
  "success": true,
  "message": "Capítulo \"Cap 21\" de \"Asa Noturna\" deletado",
  "fileDeleted": true,
  "seriesNowEmpty": false,
  "seriesId": "clxyz123..."
}
```

> **Dica para o frontend:** Se `seriesNowEmpty: true`, ofereça ao usuário a opção de deletar a série inteira.

---

### `PUT /admin/media/:id`

Edita metadados de um capítulo manualmente. Todos os campos são opcionais.

**Body:**

```json
{
  "title": "Capítulo Especial",
  "number": 0,
  "volume": 1,
  "year": 2024
}
```

**Response:**

```json
{
  "success": true,
  "media": {
    "id": "media_abc...",
    "title": "Capítulo Especial",
    "number": 0,
    "volume": 1,
    "year": 2024,
    "series": { "title": "Asa Noturna" }
  }
}
```

---

### `POST /admin/media/:id/reassign`

Move um capítulo para outra série (existente ou nova). Se a série de origem ficar vazia, é deletada automaticamente.

**Body (mover para série existente):**

```json
{
  "targetSeriesId": "clxyz456...",
  "number": 5,
  "volume": 2
}
```

**Body (criar nova série):**

```json
{
  "newSeriesTitle": "X-Men Gold"
}
```

**Validação:** Deve informar `targetSeriesId` OU `newSeriesTitle`.

**Response:**

```json
{
  "success": true,
  "message": "\"Cap 5\" movido de \"X-Men\" para \"X-Men Gold\"",
  "media": {
    "id": "media_abc...",
    "title": "Cap 5",
    "number": 5,
    "volume": 2,
    "series": "X-Men Gold"
  },
  "sourceSeriesDeleted": true
}
```

---

### `GET /admin/parse-preview`

Preview do resultado do parser para um nome de arquivo. Útil para testar antes de fazer upload.

**Query:** `?filename=CapAmer%2301.Vol12(2025)(AHQ-SQ).cbr`

**Response:**

```json
{
  "original": "CapAmer#01.Vol12(2025)(AHQ-SQ).cbr",
  "parsed": {
    "title": "Captain America",
    "normalizedTitle": "Captain America",
    "number": 1,
    "volume": 12,
    "year": 2025,
    "isOneShot": false
  }
}
```

> Utiliza o mesmo parser do upload com dicionário de 60+ abreviações e remoção automática de 80+ grupos de scan.

---

## 14. Admin — Gerenciamento de Páginas (MediaManager)

> Estes endpoints permitem manipulação granular de páginas dentro de arquivos CBZ: visualizar, reordenar, deletar, adicionar, substituir e dividir capítulos.

### `GET /admin/medias`

Lista todas as mídias (capítulos) com filtros avançados e paginação.

**Query:**

| Parâmetro   | Tipo   | Padrão      | Descrição                                                                             |
| ----------- | ------ | ----------- | ------------------------------------------------------------------------------------- |
| `page`      | number | `1`         | Página de resultados                                                                  |
| `limit`     | number | `50`        | Itens por página (máx: 200)                                                           |
| `search`    | string | —           | Busca no título da mídia ou nome da série                                             |
| `seriesId`  | string | —           | Filtra por série específica                                                           |
| `extension` | string | —           | Filtra por extensão (`cbz`, `cbr`, `pdf`, `epub`)                                     |
| `sort`      | string | `updatedAt` | Campo de ordenação (`title`, `number`, `size`, `pageCount`, `createdAt`, `updatedAt`) |
| `order`     | string | `desc`      | Direção: `asc` ou `desc`                                                              |
| `orphan`    | string | —           | Se `true`, mostra apenas mídias sem arquivo no disco                                  |

**Response:**

```json
{
  "medias": [
    {
      "id": "media_abc...",
      "title": "Asa Noturna - Cap 21",
      "number": 21,
      "volume": null,
      "year": null,
      "extension": "cbz",
      "size": 31457280,
      "path": "/library_data/Asa Noturna/Asa Noturna - Cap 21.cbz",
      "pageCount": 24,
      "isReady": true,
      "isOneShot": false,
      "createdAt": "2026-02-28T14:00:00.000Z",
      "fileExists": true,
      "seriesId": "clxyz...",
      "seriesTitle": "Asa Noturna",
      "seriesCoverUrl": "/series/clxyz.../cover"
    }
  ],
  "pagination": {
    "total": 120,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

---

### `GET /admin/medias/:id`

Detalhes completos de uma mídia incluindo lista de páginas e informações de leitura.

**Response:**

```json
{
  "id": "media_abc...",
  "title": "Asa Noturna - Cap 21",
  "number": 21,
  "volume": null,
  "year": null,
  "extension": "cbz",
  "size": 31457280,
  "path": "/library_data/Asa Noturna/Asa Noturna - Cap 21.cbz",
  "pageCount": 24,
  "isReady": true,
  "isOneShot": false,
  "createdAt": "2026-02-28T14:00:00.000Z",
  "seriesId": "clxyz...",
  "series": {
    "id": "clxyz...",
    "title": "Asa Noturna",
    "coverPath": "/path/to/cover.jpg"
  },
  "fileExists": true,
  "pages": [
    { "index": 1, "filename": "page_0001.webp", "mimeType": "image/webp" },
    { "index": 2, "filename": "page_0002.webp", "mimeType": "image/webp" }
  ],
  "readProgress": [
    {
      "userId": "clxyz123...",
      "page": 15,
      "finished": false,
      "updatedAt": "2026-03-01T15:30:00.000Z"
    }
  ],
  "readersCount": 1
}
```

---

### `GET /admin/medias/:id/pages`

Lista detalhada de todas as páginas de um capítulo com dimensões e tamanho.

**Response:**

```json
{
  "mediaId": "media_abc...",
  "title": "Asa Noturna - Cap 21",
  "totalPages": 24,
  "pages": [
    {
      "index": 1,
      "filename": "page_0001.webp",
      "mimeType": "image/webp",
      "size": 245760,
      "width": 1200,
      "height": 1800
    },
    {
      "index": 2,
      "filename": "page_0002.webp",
      "mimeType": "image/webp",
      "size": 312840,
      "width": 1200,
      "height": 1800
    }
  ]
}
```

---

### `GET /admin/medias/:id/pages/:page/thumbnail`

Gera e retorna thumbnail de uma página específica.

**Parâmetros:**

- `:page` — Número da página (1-indexed)
- **Query:** `?width=300` (padrão: 300, máx: 600)

**Response:** `image/jpeg` (binário, qualidade 75, cache 1h)

---

### `POST /admin/medias/:id/pages/delete`

Deleta páginas específicas de um CBZ. Renumera as páginas restantes automaticamente.

**Body:**

```json
{ "pages": [1, 3, 5] }
```

> Páginas são **1-indexed**. Não é possível deletar todas as páginas.

**Response:**

```json
{
  "success": true,
  "message": "3 página(s) removida(s) de \"Asa Noturna - Cap 21\"",
  "details": {
    "pagesDeleted": 3,
    "deletedPages": [1, 3, 5],
    "remainingPages": 21,
    "newSize": 28311552
  }
}
```

**Erros:**

| Status | Motivo                                                          |
| ------ | --------------------------------------------------------------- |
| 400    | Páginas inválidas (fora do intervalo)                           |
| 400    | Não pode deletar todas as páginas (use DELETE /admin/media/:id) |
| 400    | Formato não suportado (apenas CBZ)                              |

---

### `POST /admin/medias/:id/pages/reorder`

Reordena páginas dentro de um CBZ. O array deve conter cada página exatamente uma vez.

**Body:**

```json
{ "order": [3, 1, 2, 5, 4] }
```

> O array `order` usa 1-indexed. `[3, 1, 2]` significa: página 3 vira 1ª, página 1 vira 2ª, página 2 vira 3ª.

**Response:**

```json
{
  "success": true,
  "message": "Páginas de \"Asa Noturna - Cap 21\" reordenadas com sucesso",
  "details": {
    "totalPages": 24,
    "newOrder": [
      3, 1, 2, 5, 4, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
      22, 23, 24
    ]
  }
}
```

**Validação:** O array deve ter exatamente N elementos (total de páginas) e conter cada número de 1 a N uma única vez.

---

### `POST /admin/medias/:id/pages/add`

Adiciona novas páginas a um CBZ existente. Multipart form-data.

**Body:** `multipart/form-data` com campo `files` (imagens)
**Query:** `?insertAt=5` — Posição de inserção (1-indexed, padrão: final)

> Imagens são validadas por sharp (dimensões devem ser > 0). Apenas formatos de imagem são aceitos.

**Response:**

```json
{
  "success": true,
  "message": "3 página(s) adicionada(s) a \"Asa Noturna - Cap 21\"",
  "details": {
    "pagesAdded": 3,
    "insertedAt": 5,
    "totalPages": 27
  }
}
```

---

### `PUT /admin/medias/:id/pages/:page`

Substitui uma página específica por uma nova imagem. Multipart form-data.

**Parâmetros:**

- `:page` — Número da página a substituir (1-indexed)

**Body:** `multipart/form-data` com campo `file` (uma imagem)

**Response:**

```json
{
  "success": true,
  "message": "Página 5 de \"Asa Noturna - Cap 21\" substituída com sucesso"
}
```

---

### `POST /admin/medias/:id/split`

Divide um capítulo em dois no ponto especificado. Cria um novo registro de mídia para a segunda parte.

**Body:**

```json
{
  "splitAfterPage": 10,
  "newTitle": "Asa Noturna - Cap 21 Parte 2",
  "newNumber": 21.5
}
```

| Campo            | Tipo   | Obrigatório | Descrição                                               |
| ---------------- | ------ | ----------- | ------------------------------------------------------- |
| `splitAfterPage` | number | Sim         | Divide após esta página (1-indexed)                     |
| `newTitle`       | string | Não         | Título do novo capítulo (padrão: "Série - Cap N.5")     |
| `newNumber`      | number | Não         | Número do novo capítulo (padrão: número original + 0.5) |

**Response:**

```json
{
  "success": true,
  "message": "\"Asa Noturna - Cap 21\" dividido na página 10",
  "original": {
    "id": "media_abc...",
    "title": "Asa Noturna - Cap 21",
    "pages": 10
  },
  "newChapter": {
    "id": "media_def...",
    "title": "Asa Noturna - Cap 21 Parte 2",
    "number": 21.5,
    "pages": 14,
    "path": "/library_data/Asa Noturna/Asa Noturna - Cap 21.5.cbz"
  }
}
```

---

### `POST /admin/medias/bulk-delete`

Deleta múltiplas mídias de uma vez.

**Body:**

```json
{
  "mediaIds": ["media_abc...", "media_def...", "media_ghi..."],
  "deleteFiles": true
}
```

**Response:**

```json
{
  "success": true,
  "message": "3 mídia(s) deletada(s)",
  "details": {
    "totalDeleted": 3,
    "totalFilesDeleted": 3,
    "results": [
      { "id": "media_abc...", "title": "Cap 1", "success": true },
      { "id": "media_def...", "title": "Cap 2", "success": true },
      {
        "id": "media_ghi...",
        "title": "?",
        "success": false,
        "error": "Não encontrado"
      }
    ]
  }
}
```

---

### `POST /admin/medias/bulk-move`

Move múltiplas mídias para outra série de uma vez. Arquivos são movidos fisicamente para a pasta da série de destino.

**Body:**

```json
{
  "mediaIds": ["media_abc...", "media_def..."],
  "targetSeriesId": "clxyz456..."
}
```

**Response:**

```json
{
  "success": true,
  "message": "2 mídia(s) movida(s) para \"X-Men Gold\"",
  "details": {
    "totalMoved": 2,
    "targetSeries": "X-Men Gold",
    "results": [
      {
        "id": "media_abc...",
        "title": "Cap 1",
        "success": true,
        "fromSeries": "X-Men"
      },
      {
        "id": "media_def...",
        "title": "Cap 2",
        "success": true,
        "fromSeries": "X-Men"
      }
    ],
    "emptiedSeries": {
      "message": "Estas séries ficaram sem capítulos e podem ser deletadas:",
      "series": ["X-Men"]
    }
  }
}
```

> `emptiedSeries` só aparece quando alguma série de origem ficou sem capítulos.

---

## 15. Admin — Metadados Multi-Fonte

### `GET /admin/metadata/providers`

Lista provedores de metadados configurados e sua disponibilidade.

**Response:**

```json
{
  "providers": [
    { "name": "anilist", "displayName": "AniList", "available": true },
    { "name": "mangadex", "displayName": "MangaDex", "available": true },
    { "name": "wikipedia", "displayName": "Wikipedia", "available": true },
    { "name": "comicvine", "displayName": "Comic Vine", "available": false }
  ]
}
```

> ComicVine requer a variável `COMIC_VINE_API_KEY` (gratuita em comicvine.gamespot.com/api).

---

### `GET /admin/metadata/search`

Busca metadados em múltiplas fontes simultaneamente. Resolve automaticamente títulos PT-BR (ex: "Asa Noturna" → "Nightwing").

**Query:** `?q=Asa Noturna&limit=10`

**Response:**

```json
{
  "query": "Asa Noturna",
  "count": 5,
  "sources": ["anilist", "mangadex", "wikipedia"],
  "results": [
    {
      "externalId": 12345,
      "source": "anilist",
      "title": "Nightwing",
      "titleEnglish": "Nightwing",
      "titleNative": null,
      "titlePortuguese": null,
      "alternativeTitles": ["Asa Noturna"],
      "description": "Dick Grayson, formerly Batman's sidekick Robin...",
      "genres": ["Action", "Superhero"],
      "tags": ["Anti-Hero", "Super Power"],
      "author": "Tom Taylor",
      "artist": "Bruno Redondo",
      "status": "RELEASING",
      "chapters": null,
      "volumes": 4,
      "startYear": 2016,
      "endYear": null,
      "averageScore": 82,
      "popularity": 15000,
      "coverUrlLarge": "https://s4.anilist.co/file/anilistcdn/...",
      "coverUrlMedium": "https://s4.anilist.co/file/anilistcdn/...",
      "bannerUrl": "https://s4.anilist.co/file/anilistcdn/...",
      "isAdult": false,
      "countryOfOrigin": "US",
      "matchConfidence": 85
    },
    {
      "externalId": "abc-123-uuid",
      "source": "mangadex",
      "title": "Nightwing",
      "titlePortuguese": "Asa Noturna",
      "matchConfidence": 78
    }
  ]
}
```

**Campos do resultado:**

| Campo                              | Tipo               | Descrição                                              |
| ---------------------------------- | ------------------ | ------------------------------------------------------ |
| `externalId`                       | `number \| string` | ID na fonte (AniList=number, MangaDex=UUID)            |
| `source`                           | `string`           | Fonte: `anilist`, `mangadex`, `wikipedia`, `comicvine` |
| `title`                            | `string`           | Título principal (romaji / original)                   |
| `titleEnglish`                     | `string?`          | Título em inglês                                       |
| `titlePortuguese`                  | `string?`          | Título em PT-BR (quando disponível)                    |
| `alternativeTitles`                | `string[]`         | Todos os títulos alternativos                          |
| `matchConfidence`                  | `number`           | Confiança do match (0-100)                             |
| `description`                      | `string?`          | Sinopse                                                |
| `genres`                           | `string[]`         | Gêneros                                                |
| `tags`                             | `string[]`         | Tags relevantes                                        |
| `author` / `artist`                | `string?`          | Autor e artista                                        |
| `coverUrlLarge` / `coverUrlMedium` | `string?`          | URLs da capa                                           |

---

### `POST /admin/series/:id/enrich`

Aplica metadados de qualquer fonte a uma série. Três modos de uso:

**Body (opção 1 — por ID externo + fonte):**

```json
{
  "externalId": 12345,
  "source": "anilist"
}
```

**Body (opção 2 — retrocompatível AniList):**

```json
{
  "anilistId": 12345
}
```

**Body (opção 3 — busca por título):**

```json
{
  "searchTitle": "Nightwing"
}
```

**Validação:** Deve informar pelo menos um: `externalId+source`, `anilistId` ou `searchTitle`.

**Response:**

```json
{
  "success": true,
  "source": "anilist",
  "matched": "Nightwing",
  "confidence": 85,
  "series": {
    "id": "clxyz...",
    "title": "Asa Noturna",
    "description": "Dick Grayson, formerly Batman's sidekick Robin...",
    "author": "Tom Taylor",
    "artist": "Bruno Redondo",
    "status": "Em Andamento",
    "tags": "Action, Superhero, Anti-Hero, Super Power",
    "coverPath": "/path/to/cover.jpg",
    "sourceType": "LOCAL",
    "createdAt": "2026-01-20T10:00:00.000Z",
    "updatedAt": "2026-03-01T16:00:00.000Z"
  }
}
```

---

### `POST /admin/enrich-all`

Re-enriquece todas as séries sem metadados (descrição ou tags vazias) usando múltiplas fontes. Executa em background — responde imediatamente e processa em segundo plano.

**Response:**

```json
{
  "success": true,
  "message": "Enriquecimento iniciado para 5 séries sem metadados",
  "total": 5
}
```

---

## 16. Admin — Dashboard e Listagem

### `GET /admin/dashboard`

Visão geral da biblioteca para o painel admin. Inclui totais, saúde dos metadados e séries recentes.

**Response:**

```json
{
  "overview": {
    "totalSeries": 15,
    "totalChapters": 120,
    "totalUsers": 3,
    "totalPages": 3000
  },
  "health": {
    "seriesWithoutMeta": 2,
    "seriesWithoutTags": 3,
    "seriesWithoutCover": 1,
    "metadataCompleteness": 87
  },
  "recentSeries": [
    {
      "id": "clxyz...",
      "title": "Asa Noturna",
      "description": "Dick Grayson...",
      "tags": "Action, Superhero",
      "author": "Tom Taylor",
      "status": "Ongoing",
      "coverPath": "/path/to/cover.jpg",
      "createdAt": "2026-02-28T14:00:00.000Z",
      "coverUrl": "/series/clxyz.../cover",
      "chaptersCount": 8
    }
  ]
}
```

---

### `GET /admin/series`

Lista todas as séries com paginação, busca e filtros (para tabela admin).

**Query:**

| Parâmetro     | Tipo   | Padrão | Descrição                              |
| ------------- | ------ | ------ | -------------------------------------- |
| `page`        | number | `1`    | Página de resultados                   |
| `limit`       | number | `50`   | Itens por página                       |
| `search`      | string | —      | Busca por título                       |
| `missingMeta` | string | —      | Se `true`, filtra séries sem metadados |

**Response:**

```json
{
  "series": [
    {
      "id": "clxyz...",
      "title": "Asa Noturna",
      "description": "Dick Grayson...",
      "author": "Tom Taylor",
      "artist": "Bruno Redondo",
      "status": "Ongoing",
      "tags": "Action, Superhero",
      "coverPath": "/path/to/cover.jpg",
      "coverUrl": "/series/clxyz.../cover",
      "sourceType": "LOCAL",
      "createdAt": "2026-01-20T10:00:00.000Z",
      "updatedAt": "2026-02-28T14:00:00.000Z",
      "chaptersCount": 8,
      "hasDescription": true,
      "hasTags": true,
      "hasCover": true
    }
  ],
  "pagination": {
    "total": 15,
    "page": 1,
    "limit": 50,
    "totalPages": 1
  }
}
```

---

## 17. Admin — IPs Bloqueados

### `GET /admin/blocked-ips`

Lista IPs bloqueados por tentativas de login falhadas.

**Response:**

```json
{
  "count": 2,
  "ips": [
    {
      "ip": "192.168.1.100",
      "attempts": 10,
      "blockedAt": "2026-03-01T12:00:00.000Z",
      "blockedUntil": "2026-03-01T12:30:00.000Z"
    }
  ]
}
```

---

### `GET /admin/ip-info/:ip`

Informações detalhadas de tentativas de um IP específico.

**Response:**

```json
{
  "ip": "192.168.1.100",
  "attempts": 10,
  "lastAttempt": "2026-03-01T12:00:00.000Z",
  "isBlocked": true,
  "blockedUntil": "2026-03-01T12:30:00.000Z"
}
```

**Erro (404):** Se o IP não tem tentativas registradas.

---

### `POST /admin/unblock-ip`

Desbloqueia um IP manualmente.

**Body:**

```json
{ "ip": "192.168.1.100" }
```

**Response:**

```json
{
  "message": "IP desbloqueado com sucesso",
  "ip": "192.168.1.100"
}
```

**Erro (404):** Se o IP não estava bloqueado.

---

## 18. Admin — Gerenciamento de Usuários

> **Todas as rotas requerem role ADMIN.**

### `GET /admin/users/stats`

Estatísticas gerais de usuários para o dashboard.

**Resposta:**

```json
{
  "totalUsers": 42,
  "byRole": { "ADMIN": 1, "EDITOR": 5, "SUBSCRIBER": 30, "FREE": 6 },
  "byStatus": { "ACTIVE": 35, "INACTIVE": 7 },
  "activeEditors": 5,
  "recentUsers": [
    {
      "id": "...",
      "name": "...",
      "email": "...",
      "role": "EDITOR",
      "createdAt": "..."
    }
  ]
}
```

---

### `GET /admin/users`

Lista todos os usuários com paginação e busca.

**Query:** `?search=nome&role=EDITOR&subStatus=ACTIVE&page=1&limit=20&sortBy=createdAt&sortOrder=desc`

| Parâmetro | Tipo   | Padrão      | Descrição                                    |
| --------- | ------ | ----------- | -------------------------------------------- |
| search    | string | —           | Busca por nome ou email                      |
| role      | string | —           | Filtra: ADMIN, EDITOR, SUBSCRIBER, FREE      |
| subStatus | string | —           | Filtra: ACTIVE, INACTIVE, PAST_DUE, CANCELED |
| page      | string | "1"         | Página                                       |
| limit     | string | "20"        | Itens por página (max 100)                   |
| sortBy    | string | "createdAt" | Campo de ordenação                           |
| sortOrder | string | "desc"      | asc ou desc                                  |

**Resposta:**

```json
{
  "users": [
    {
      "id": "...",
      "name": "Editor Maria",
      "email": "maria@example.com",
      "role": "EDITOR",
      "subStatus": "ACTIVE",
      "subExpiresAt": null,
      "maxDevices": 3,
      "createdAt": "...",
      "updatedAt": "...",
      "_count": { "sessions": 2, "readProgress": 0, "submittedApprovals": 15 }
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 }
}
```

---

### `GET /admin/users/:id`

Detalhes de um usuário específico, com sessões ativas e submissões recentes.

---

### `POST /admin/users`

Cria um novo usuário (admin pode definir a role).

**Body:**

```json
{
  "name": "Editor Maria",
  "email": "maria@example.com",
  "password": "senhaforte123",
  "role": "EDITOR",
  "subStatus": "ACTIVE"
}
```

| Campo     | Tipo   | Obrigatório | Descrição                                             |
| --------- | ------ | ----------- | ----------------------------------------------------- |
| name      | string | ✅          | Nome (2-100 chars)                                    |
| email     | string | ✅          | Email válido                                          |
| password  | string | ✅          | Senha (min 8 chars)                                   |
| role      | string | ❌          | ADMIN, EDITOR, SUBSCRIBER, FREE (default: FREE)       |
| subStatus | string | ❌          | ACTIVE, INACTIVE, etc. (EDITOR/ADMIN default: ACTIVE) |

**Resposta (201):**

```json
{
  "message": "Usuário criado com sucesso",
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "role": "EDITOR",
    "subStatus": "ACTIVE",
    "createdAt": "..."
  }
}
```

---

### `PUT /admin/users/:id`

Atualiza dados de um usuário. Todos os campos são opcionais.

**Body:**

```json
{
  "name": "Novo Nome",
  "role": "EDITOR",
  "subStatus": "ACTIVE",
  "maxDevices": 5,
  "password": "novaSenha123"
}
```

**Nota:** Admin não pode alterar sua própria role.

---

### `DELETE /admin/users/:id`

Exclui um usuário e todos os dados associados (cascade). Admin não pode excluir a si mesmo e não pode excluir o único admin do sistema.

---

### `POST /admin/users/:id/revoke-sessions`

Revoga todas as sessões de um usuário. Útil após troca de role ou desativação.

**Resposta:**

```json
{
  "message": "3 sessão(ões) revogada(s)",
  "sessionsRevoked": 3
}
```

---

## 19. Admin — Aprovação de Conteúdo

> **Sistema de fila de aprovação para conteúdo enviado por EDITORs.**
> Uploads de ADMIN vão direto para processamento. Uploads de EDITOR ficam pendentes.

### `GET /admin/approvals/stats`

Contadores rápidos para o dashboard de aprovação.

**Resposta:**

```json
{
  "pending": 5,
  "approved": 120,
  "rejected": 8,
  "todayPending": 2
}
```

---

### `GET /admin/approvals`

Lista aprovações com filtros.

**Query:** `?status=PENDING&page=1&limit=20&submitterId=uuid`

| Parâmetro   | Tipo   | Padrão    | Descrição                    |
| ----------- | ------ | --------- | ---------------------------- |
| status      | string | "PENDING" | PENDING, APPROVED, REJECTED  |
| page        | string | "1"       | Página                       |
| limit       | string | "20"      | Itens por página             |
| submitterId | string | —         | Filtra por editor específico |

**Resposta:**

```json
{
  "approvals": [
    {
      "id": "...",
      "submitter": { "id": "...", "name": "Editor Maria", "email": "..." },
      "status": "PENDING",
      "originalName": "Naruto Cap 001.cbz",
      "safeName": "Naruto-Cap-001.cbz",
      "fileSize": 52428800,
      "fileHash": "abc123...",
      "targetSeriesId": null,
      "forcedSeriesTitle": null,
      "reviewer": null,
      "reviewedAt": null,
      "rejectionReason": null,
      "createdAt": "..."
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 5, "totalPages": 1 }
}
```

---

### `GET /admin/approvals/:id`

Detalhes de uma aprovação específica, incluindo se o arquivo temporário ainda existe.

---

### `POST /admin/approvals/:id/approve`

Aprova o conteúdo. Move o arquivo para a fila BullMQ e notifica o editor.

**Resposta:**

```json
{
  "message": "Conteúdo aprovado e enviado para processamento",
  "jobId": "upload-uuid",
  "approval": {
    "id": "...",
    "originalName": "Naruto Cap 001.cbz",
    "submitter": { "id": "...", "name": "Editor Maria" }
  }
}
```

**Erro (410):** Se o arquivo temporário já expirou/foi removido.

---

### `POST /admin/approvals/:id/reject`

Rejeita o conteúdo com motivo obrigatório. Remove o arquivo temporário e notifica o editor.

**Body:**

```json
{
  "reason": "Arquivo corrompido ou conteúdo duplicado"
}
```

---

### `POST /admin/approvals/bulk-approve`

Aprova múltiplos conteúdos de uma vez (max 50).

**Body:**

```json
{
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Resposta:**

```json
{
  "message": "3 aprovado(s), 0 falha(s)",
  "approved": [{ "id": "...", "originalName": "...", "jobId": "..." }],
  "failed": []
}
```

---

### `POST /admin/approvals/bulk-reject`

Rejeita múltiplos conteúdos (max 50).

**Body:**

```json
{
  "ids": ["uuid1", "uuid2"],
  "reason": "Conteúdo não autorizado"
}
```

---

## 20. Editor — Minhas Submissões

### `GET /my/submissions`

Lista as submissões do editor logado (qualquer role pode acessar, mas só vê as próprias).

**Query:** `?status=PENDING&page=1&limit=20`

| Parâmetro | Tipo   | Padrão | Descrição                   |
| --------- | ------ | ------ | --------------------------- |
| status    | string | —      | PENDING, APPROVED, REJECTED |
| page      | string | "1"    | Página                      |
| limit     | string | "20"   | Itens por página            |

**Resposta:**

```json
{
  "submissions": [
    {
      "id": "...",
      "status": "PENDING",
      "originalName": "Naruto Cap 001.cbz",
      "fileSize": 52428800,
      "createdAt": "...",
      "reviewer": null,
      "reviewedAt": null,
      "rejectionReason": null
    }
  ],
  "pendingCount": 3,
  "pagination": { "page": 1, "limit": 20, "total": 15, "totalPages": 1 }
}
```

---

## 21. Notificações

### `GET /notifications`

Lista notificações do usuário autenticado com filtros.

**Query:** `?read=false&limit=20&offset=0`

| Parâmetro | Tipo   | Padrão | Descrição                                 |
| --------- | ------ | ------ | ----------------------------------------- |
| `read`    | string | —      | `true` = só lidas, `false` = só não lidas |
| `limit`   | number | 20     | Quantidade máxima                         |
| `offset`  | number | 0      | Offset para paginação                     |

**Tipos de notificação:** `UPLOAD_SUCCESS`, `SCAN_COMPLETE`, `SCAN_ERROR`, `NEW_CHAPTER`

**Response:**

```json
{
  "notifications": [
    {
      "id": "notif_abc...",
      "userId": "clxyz123...",
      "type": "UPLOAD_SUCCESS",
      "title": "Upload concluído!",
      "message": "Cap 22 de Asa Noturna foi processado com sucesso",
      "data": "{\"seriesId\":\"clxyz...\",\"mediaId\":\"media_abc...\"}",
      "read": false,
      "createdAt": "2026-03-01T14:00:00.000Z"
    }
  ],
  "unreadCount": 3
}
```

---

### `POST /notifications/:id/read`

Marca uma notificação como lida.

**Response:**

```json
{ "success": true }
```

---

### `POST /notifications/mark-all-read`

Marca **todas** as notificações do usuário como lidas.

**Response:**

```json
{ "success": true }
```

---

### `DELETE /notifications/:id`

Deleta uma notificação permanentemente.

**Response:**

```json
{ "success": true }
```

---

## 22. Analytics (Estatísticas Detalhadas)

### `GET /stats/dashboard`

Dashboard consolidado de analytics do usuário (semana + mês + all-time).

**Response:**

```json
{
  "thisWeek": {
    "pagesRead": 150,
    "timeSpent": 9000,
    "chaptersCompleted": 6,
    "avg": {
      "pagesPerDay": 21,
      "timePerDay": 1286,
      "chaptersPerDay": "0.9"
    }
  },
  "thisMonth": {
    "pagesRead": 500,
    "timeSpent": 30000,
    "chaptersCompleted": 20,
    "avg": {
      "pagesPerDay": 25,
      "timePerDay": 1500,
      "chaptersPerDay": "1.0"
    }
  },
  "allTime": {
    "totals": {
      "pagesRead": 1050,
      "timeSpent": 86400,
      "chaptersCompleted": 42
    },
    "favoriteGenre": "Action",
    "topSeries": [
      {
        "series": {
          "id": "clxyz...",
          "title": "Asa Noturna",
          "coverUrl": "/series/clxyz.../cover"
        },
        "chaptersRead": 8
      }
    ],
    "daysActive": 30
  }
}
```

---

### `GET /stats/week`

Estatísticas detalhadas desta semana (dia a dia).

**Response:**

```json
{
  "stats": [
    {
      "id": "stat_abc...",
      "date": "2026-02-24T00:00:00.000Z",
      "pagesRead": 30,
      "timeSpent": 1800,
      "chaptersCompleted": 1
    }
  ],
  "totals": {
    "pagesRead": 150,
    "timeSpent": 9000,
    "chaptersCompleted": 6
  },
  "avg": {
    "pagesPerDay": 21,
    "timePerDay": 1286,
    "chaptersPerDay": "0.9"
  }
}
```

---

### `GET /stats/month`

Estatísticas deste mês.

**Response:** (mesmo formato de `/stats/week`, com dados do mês completo)

---

### `GET /stats/all-time`

Estatísticas totais acumuladas (all-time).

**Response:**

```json
{
  "totals": {
    "pagesRead": 1050,
    "timeSpent": 86400,
    "chaptersCompleted": 42
  },
  "favoriteGenre": "Action",
  "topSeries": [
    {
      "series": {
        "id": "clxyz...",
        "title": "Asa Noturna",
        "coverUrl": "/series/clxyz.../cover"
      },
      "chaptersRead": 8
    }
  ],
  "daysActive": 30
}
```

---

### `POST /stats/record`

Registra leitura de páginas (chamado pelo frontend durante a leitura ativa).

**Body:**

```json
{
  "pages": 5,
  "timeSpent": 300,
  "chapterCompleted": false
}
```

**Validação:**

- `pages`: inteiro positivo
- `timeSpent`: inteiro positivo (segundos)
- `chapterCompleted`: boolean (opcional)

**Response:**

```json
{
  "id": "stat_abc...",
  "userId": "clxyz123...",
  "date": "2026-03-01T00:00:00.000Z",
  "pagesRead": 35,
  "timeSpent": 2100,
  "chaptersCompleted": 1
}
```

---

## Resumo — Total de Endpoints: 112

| Seção                              | Endpoints | Métodos                                                                                                                                                          |
| ---------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Auth (Públicas)                 | 3         | POST, POST, GET                                                                                                                                                  |
| 2. Sessões/Perfil                  | 5         | GET, POST, POST, GET, DELETE                                                                                                                                     |
| 3. Biblioteca                      | 3         | GET, GET, GET                                                                                                                                                    |
| 4. Discover                        | 4         | GET, GET, GET, GET                                                                                                                                               |
| 5. Categorias                      | 6         | GET, GET, GET, POST, POST, GET                                                                                                                                   |
| 6. Leitor                          | 3         | GET, GET, POST                                                                                                                                                   |
| 7. Progresso                       | 10        | GET, GET, GET, GET, GET, GET, POST, DELETE, POST, DELETE                                                                                                         |
| 8. User Stats                      | 7         | GET (×7)                                                                                                                                                         |
| 9. Upload                          | 4         | POST, POST, POST (folder), POST (series)                                                                                                                         |
| 10. Jobs (Gerenciamento)           | 12        | GET, GET, GET, GET, POST, POST, DELETE, DELETE, POST, POST, POST, GET (SSE)                                                                                      |
| 11. Scan                           | 3         | POST, GET, GET                                                                                                                                                   |
| 12. Admin — Séries                 | 4         | PUT, DELETE, POST (bulk), POST (merge)                                                                                                                           |
| 13. Admin — Capítulos              | 4         | DELETE, PUT, POST (reassign), GET (parse)                                                                                                                        |
| 14. Admin — Páginas (MediaManager) | 11        | GET (list), GET (detail), GET (pages), GET (thumb), POST (delete), POST (reorder), POST (add), PUT (replace), POST (split), POST (bulk-delete), POST (bulk-move) |
| 15. Admin — Metadados              | 4         | GET, GET, POST (enrich), POST (enrich-all)                                                                                                                       |
| 16. Admin — Dashboard              | 2         | GET, GET                                                                                                                                                         |
| 17. Admin — IPs                    | 3         | GET, GET, POST                                                                                                                                                   |
| 18. Admin — Usuários               | 7         | GET (stats), GET (list), GET (detail), POST (create), PUT (update), DELETE, POST (revoke-sessions)                                                               |
| 19. Admin — Aprovações             | 7         | GET (stats), GET (list), GET (detail), POST (approve), POST (reject), POST (bulk-approve), POST (bulk-reject)                                                    |
| 20. Editor — Submissões            | 1         | GET                                                                                                                                                              |
| 21. Notificações                   | 4         | GET, POST, POST, DELETE                                                                                                                                          |
| 22. Analytics                      | 5         | GET, GET, GET, GET, POST                                                                                                                                         |

---

### Sistema Multi-Fonte de Metadados

O backend consulta automaticamente **múltiplas fontes** ao buscar metadados:

| Fonte         | API     | Melhor para                        | Rate Limit    | API Key      |
| ------------- | ------- | ---------------------------------- | ------------- | ------------ |
| **AniList**   | GraphQL | Mangás, manhwa, manhua             | 90 req/min    | Não          |
| **MangaDex**  | REST    | Títulos PT-BR, multilíngue         | 5 req/s       | Não          |
| **Wikipedia** | REST    | HQs brasileiras, contexto cultural | ~1 req/s      | Não          |
| **ComicVine** | REST    | HQs americanas (DC/Marvel)         | 200 req/15min | Sim (grátis) |

**Fluxo de busca:**

1. Título original é verificado no dicionário PT-BR→EN (50+ títulos como "Asa Noturna" → "Nightwing")
2. Busca em paralelo em todas as fontes ativas com título original + traduzido
3. Calcula confiança de cada resultado (0-100) baseado em match de título, completude dos dados, etc.
4. Mescla o melhor resultado com dados complementares das outras fontes

---

### Arquitetura de Filas BullMQ

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Upload (ADMIN)  │────▶│ Upload Queue │────▶│  Upload Worker   │
│  POST /upload    │     │ (concur.: 3) │     │  (3 instâncias)  │
└─────────────────┘     └──────────────┘     └──────────────────┘
                              ▲                        │
┌─────────────────┐     ┌─────┴────────┐
│  Upload (EDITOR) │────▶│ Content      │
│  POST /upload    │     │ Approval     │
└─────────────────┘     │ (PENDING)    │
                        └──────────────┘
                              │
                    ┌─────────┴──────────┐
                    ▼                    ▼
            ┌──────────────┐    ┌──────────────┐
            │  APPROVE     │    │  REJECT      │
            │  → BullMQ    │    │  → Cleanup   │
            └──────────────┘    └──────────────┘

┌─────────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Scan Request    │────▶│  Scan Queue  │────▶│   Scan Worker    │
│  POST /scan      │     │ (concur.: 1) │     │  (1 instância)   │
└─────────────────┘     └──────────────┘     └──────────────────┘
                                                      │
                              ┌────────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │  SSE Stream      │
                    │  /jobs/progress/ │
                    │  stream          │
                    └──────────────────┘
```

- **Redis:** Conexão compartilhada (`maxRetriesPerRequest: null`)
- **Stalled detection:** Jobs travados por >30s são detectados e reportados via SSE
- **Dedup de scan:** Apenas 1 scan pode estar ativo/pendente por vez
- **Notificações:** `UPLOAD_SUCCESS`, `SCAN_COMPLETE`, `SCAN_ERROR` enviadas automaticamente ao finalizar jobs
