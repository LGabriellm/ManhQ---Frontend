# 📚 Sistema de Gerenciamento de Mídias — Guia para Frontend

> **11 novos endpoints** para gerenciamento completo de mídias e páginas.
> Todos requerem autenticação (header `Authorization: Bearer <token>`).

---

## 📋 Visão Geral

| #   | Método | Rota                                      | Descrição                               |
| --- | ------ | ----------------------------------------- | --------------------------------------- |
| 1   | GET    | `/admin/medias`                           | Listar todas as mídias com filtros      |
| 2   | GET    | `/admin/medias/:id`                       | Detalhes de uma mídia + páginas         |
| 3   | GET    | `/admin/medias/:id/pages`                 | Listar páginas com metadados detalhados |
| 4   | GET    | `/admin/medias/:id/pages/:page/thumbnail` | Thumbnail de uma página                 |
| 5   | POST   | `/admin/medias/:id/pages/delete`          | Deletar páginas de um CBZ               |
| 6   | POST   | `/admin/medias/:id/pages/reorder`         | Reordenar páginas de um CBZ             |
| 7   | POST   | `/admin/medias/:id/pages/add`             | Adicionar imagens ao CBZ (multipart)    |
| 8   | PUT    | `/admin/medias/:id/pages/:page`           | Substituir uma página (multipart)       |
| 9   | POST   | `/admin/medias/:id/split`                 | Dividir capítulo em dois                |
| 10  | POST   | `/admin/medias/bulk-delete`               | Deletar múltiplas mídias                |
| 11  | POST   | `/admin/medias/bulk-move`                 | Mover mídias para outra série           |

---

## 1. `GET /admin/medias` — Listar Mídias

Lista todas as mídias com paginação, busca e filtros avançados.

### Query Parameters

| Param       | Tipo    | Default     | Descrição                                                                            |
| ----------- | ------- | ----------- | ------------------------------------------------------------------------------------ |
| `page`      | number  | 1           | Página atual                                                                         |
| `limit`     | number  | 50          | Items por página (max: 200)                                                          |
| `search`    | string  | —           | Busca por título da mídia ou série                                                   |
| `seriesId`  | string  | —           | Filtra por série específica                                                          |
| `extension` | string  | —           | Filtra por formato (`cbz`, `cbr`, `pdf`, `epub`)                                     |
| `sort`      | string  | `updatedAt` | Campo de ordenação: `title`, `number`, `size`, `pageCount`, `createdAt`, `updatedAt` |
| `order`     | string  | `desc`      | Direção: `asc` ou `desc`                                                             |
| `orphan`    | boolean | —           | Se `true`, retorna só mídias sem arquivo no disco                                    |

### Response

```json
{
  "medias": [
    {
      "id": "abc123...",
      "title": "Nightwing - Cap 21",
      "number": 21,
      "volume": null,
      "year": 2024,
      "extension": "cbz",
      "size": 15728640,
      "path": "/app/library_data/Nightwing/Nightwing - Cap 21.cbz",
      "pageCount": 24,
      "isReady": true,
      "isOneShot": false,
      "createdAt": "2026-03-01T...",
      "fileExists": true,
      "seriesId": "xyz789...",
      "seriesTitle": "Nightwing",
      "seriesCoverUrl": "/series/xyz789.../cover"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

### Uso no Frontend

- **Tabela/Grid de mídias** com paginação server-side
- **Barra de busca** usando `search`
- **Dropdown de série** usando `seriesId`
- **Filtro de formato** usando `extension`
- **Checkbox "Mostrar órfãs"** usando `orphan=true` para encontrar mídias com arquivos faltando

---

## 2. `GET /admin/medias/:id` — Detalhes da Mídia

Retorna info completa + lista de páginas + contagem de leitores.

### Response

```json
{
  "id": "abc123...",
  "title": "Nightwing - Cap 21",
  "number": 21,
  "volume": null,
  "year": 2024,
  "extension": "cbz",
  "size": 15728640,
  "path": "/app/library_data/Nightwing/Nightwing - Cap 21.cbz",
  "pageCount": 24,
  "isReady": true,
  "createdAt": "2026-03-01T...",
  "series": {
    "id": "xyz789...",
    "title": "Nightwing",
    "coverPath": "/covers/abc.jpg"
  },
  "fileExists": true,
  "pages": [
    { "index": 1, "filename": "page_0001.webp", "mimeType": "image/webp" },
    { "index": 2, "filename": "page_0002.webp", "mimeType": "image/webp" }
  ],
  "readProgress": [
    { "userId": "user1", "page": 15, "finished": false, "updatedAt": "..." }
  ],
  "readersCount": 3
}
```

### Uso no Frontend

- **Tela de detalhes** ao clicar numa mídia na tabela
- Mostra metadados editáveis, info do arquivo, e grid de páginas
- `readersCount` mostra quantos usuários estão lendo

---

## 3. `GET /admin/medias/:id/pages` — Listar Páginas (Detalhado)

Lista todas as páginas com tamanho e dimensões de cada imagem.

### Response

```json
{
  "mediaId": "abc123...",
  "title": "Nightwing - Cap 21",
  "totalPages": 24,
  "pages": [
    {
      "index": 1,
      "filename": "page_0001.webp",
      "mimeType": "image/webp",
      "size": 245760,
      "width": 1600,
      "height": 2400
    },
    {
      "index": 2,
      "filename": "page_0002.webp",
      "mimeType": "image/webp",
      "size": 312450,
      "width": 1600,
      "height": 2400
    }
  ]
}
```

### Uso no Frontend

- **Grid de thumbnails** para visualizar todas as páginas
- Mostra dimensões e tamanho de cada imagem
- Permite selecionar páginas para edição

---

## 4. `GET /admin/medias/:id/pages/:page/thumbnail` — Thumbnail

Retorna uma imagem thumbnail JPEG de uma página específica.

### Query Parameters

| Param   | Tipo   | Default | Descrição                         |
| ------- | ------ | ------- | --------------------------------- |
| `width` | number | 300     | Largura do thumbnail (max: 600px) |

### Response

- `Content-Type: image/jpeg`
- Imagem binária (JPEG 75%)
- Cache: `max-age=3600`

### Uso no Frontend

```html
<!-- Grid de thumbnails -->
<img src="/admin/medias/{id}/pages/{page}/thumbnail?width=200" />
```

- Use `page` em 1-indexed (1 = primeira página)
- Para grid, `width=200` é bom para performance
- Para preview, `width=400` ou `width=600`

---

## 5. `POST /admin/medias/:id/pages/delete` — Deletar Páginas

Remove páginas específicas de um CBZ. O arquivo é reconstruído sem as páginas removidas.

### Body

```json
{
  "pages": [3, 5, 7]
}
```

> Números são **1-indexed** (1 = primeira página).

### Response

```json
{
  "success": true,
  "message": "3 página(s) removida(s) de \"Nightwing - Cap 21\"",
  "details": {
    "pagesDeleted": 3,
    "deletedPages": [3, 5, 7],
    "remainingPages": 21,
    "newSize": 14155776
  }
}
```

### Regras

- Não pode deletar **todas** as páginas (use delete de mídia)
- Só funciona para **CBZ** (retorna 400 para outros formatos)
- Páginas são renumeradas automaticamente após deleção

### Uso no Frontend

- Seleciona páginas no grid → botão "Deletar selecionadas"
- Modal de confirmação: "Tem certeza que deseja remover 3 páginas?"
- Reload do grid após sucesso

---

## 6. `POST /admin/medias/:id/pages/reorder` — Reordenar Páginas

Reorganiza a ordem das páginas dentro do CBZ.

### Body

```json
{
  "order": [3, 1, 2, 5, 4]
}
```

> O array deve conter **todos** os números de 1 a N (total de páginas), na nova ordem desejada.
> Exemplo: `[3, 1, 2]` = a página que era 3 agora é a 1ª, a que era 1 é a 2ª, etc.

### Response

```json
{
  "success": true,
  "message": "Páginas de \"Nightwing - Cap 21\" reordenadas com sucesso",
  "details": {
    "totalPages": 24,
    "newOrder": [3, 1, 2, 5, 4, 6, 7, ...]
  }
}
```

### Regras

- O array precisa ter exatamente N elementos (N = total de páginas)
- Cada número deve aparecer exatamente uma vez

### Uso no Frontend

- Drag-and-drop no grid de thumbnails
- Ao soltar, envia a nova ordem completa
- Ou: botões "Mover para cima/baixo" em uma página selecionada

---

## 7. `POST /admin/medias/:id/pages/add` — Adicionar Páginas

Adiciona novas imagens ao CBZ, por padrão no final.

### Request (Multipart Form)

| Campo   | Tipo   | Descrição                                     |
| ------- | ------ | --------------------------------------------- |
| `files` | File[] | Imagens para adicionar (JPG, PNG, WebP, etc.) |

### Query Parameters

| Param      | Tipo   | Default | Descrição                                                                   |
| ---------- | ------ | ------- | --------------------------------------------------------------------------- |
| `insertAt` | number | final   | Posição de inserção (1-indexed). Ex: `?insertAt=5` insere antes da página 5 |

### Response

```json
{
  "success": true,
  "message": "3 página(s) adicionada(s) a \"Nightwing - Cap 21\"",
  "details": {
    "pagesAdded": 3,
    "insertedAt": 5,
    "totalPages": 27
  }
}
```

### Uso no Frontend

```js
const formData = new FormData();
files.forEach((f) => formData.append("files", f));

await fetch(`/admin/medias/${id}/pages/add?insertAt=5`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

- Botão "Adicionar páginas" com file picker (aceita múltiplos)
- Opção "Inserir na posição:" com dropdown das posições

---

## 8. `PUT /admin/medias/:id/pages/:page` — Substituir Página

Substitui uma página existente por uma nova imagem.

### Request (Multipart Form)

| Campo  | Tipo | Descrição     |
| ------ | ---- | ------------- |
| `file` | File | A nova imagem |

### Response

```json
{
  "success": true,
  "message": "Página 5 de \"Nightwing - Cap 21\" substituída com sucesso"
}
```

### Uso no Frontend

```js
const formData = new FormData();
formData.append("file", newImage);

await fetch(`/admin/medias/${id}/pages/5`, {
  method: "PUT",
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

- Botão "Substituir" no thumbnail da página
- Abre file picker, envia a nova imagem

---

## 9. `POST /admin/medias/:id/split` — Dividir Capítulo

Divide um capítulo em dois a partir de uma página.

### Body

```json
{
  "splitAfterPage": 10,
  "newTitle": "Nightwing - Cap 21.5",
  "newNumber": 21.5
}
```

| Campo            | Tipo   | Obrigatório | Descrição                                                                         |
| ---------------- | ------ | ----------- | --------------------------------------------------------------------------------- |
| `splitAfterPage` | number | Sim         | Dividir após esta página (1-indexed). Páginas 1-10 ficam no original, 11+ no novo |
| `newTitle`       | string | Não         | Título do novo capítulo (default: auto-gerado)                                    |
| `newNumber`      | number | Não         | Número do novo capítulo (default: número original + 0.5)                          |

### Response

```json
{
  "success": true,
  "message": "\"Nightwing - Cap 21\" dividido na página 10",
  "original": {
    "id": "abc123...",
    "title": "Nightwing - Cap 21",
    "pages": 10
  },
  "newChapter": {
    "id": "def456...",
    "title": "Nightwing - Cap 21.5",
    "number": 21.5,
    "pages": 14,
    "path": "/app/library_data/Nightwing/Nightwing - Cap 21.5.cbz"
  }
}
```

### Uso no Frontend

- Seleciona uma página no grid → "Dividir aqui"
- Modal: "Dividir após a página 10? Páginas 1-10 ficam no original, 11-24 serão um novo capítulo"
- Input opcional para título/número do novo capítulo

---

## 10. `POST /admin/medias/bulk-delete` — Deletar em Lote

Deleta múltiplas mídias com seus arquivos.

### Body

```json
{
  "mediaIds": ["abc123...", "def456...", "ghi789..."],
  "deleteFiles": true
}
```

| Campo         | Tipo     | Default | Descrição                            |
| ------------- | -------- | ------- | ------------------------------------ |
| `mediaIds`    | string[] | —       | IDs das mídias                       |
| `deleteFiles` | boolean  | true    | Se `false`, mantém arquivos no disco |

### Response

```json
{
  "success": true,
  "message": "3 mídia(s) deletada(s)",
  "details": {
    "totalDeleted": 3,
    "totalFilesDeleted": 3,
    "results": [
      { "id": "abc123...", "title": "Cap 1", "success": true },
      { "id": "def456...", "title": "Cap 2", "success": true },
      {
        "id": "ghi789...",
        "title": "?",
        "success": false,
        "error": "Não encontrado"
      }
    ]
  }
}
```

### Uso no Frontend

- Checkbox de seleção múltipla na tabela de mídias
- Botão "Deletar selecionadas" na toolbar
- Modal de confirmação com lista dos capítulos

---

## 11. `POST /admin/medias/bulk-move` — Mover em Lote

Move múltiplas mídias para outra série.

### Body

```json
{
  "mediaIds": ["abc123...", "def456..."],
  "targetSeriesId": "series_xyz..."
}
```

### Response

```json
{
  "success": true,
  "message": "2 mídia(s) movida(s) para \"Batman\"",
  "details": {
    "totalMoved": 2,
    "targetSeries": "Batman",
    "results": [
      {
        "id": "abc123...",
        "title": "Cap 1",
        "success": true,
        "fromSeries": "Nightwing"
      },
      {
        "id": "def456...",
        "title": "Cap 2",
        "success": true,
        "fromSeries": "Nightwing"
      }
    ],
    "emptiedSeries": {
      "message": "Estas séries ficaram sem capítulos e podem ser deletadas:",
      "series": ["Nightwing"]
    }
  }
}
```

### Notas

- Arquivos físicos são movidos para a pasta da série destino
- Se a série de origem ficar vazia, `emptiedSeries` retorna a lista para o frontend oferecer deleção
- Mídias que já estão na série destino são ignoradas (não duplica)

### Uso no Frontend

- Seleciona mídias → botão "Mover para..."
- Dropdown/search de séries para escolher destino
- Após sucesso, se `emptiedSeries` existir, pergunta: "A série X ficou vazia. Deseja deletá-la?"

---

## 🎯 Fluxo Sugerido para o Frontend

### Tela: Gerenciador de Mídias (`/admin/medias`)

```
┌──────────────────────────────────────────────────────┐
│  🔍 Busca  │  📂 Série ▼  │  📄 Formato ▼  │ Ações │
├──────────────────────────────────────────────────────┤
│ ☐ │ Cap 1  │ Nightwing │ CBZ │ 24pg │ 15MB │ ⋯    │
│ ☐ │ Cap 2  │ Nightwing │ CBZ │ 22pg │ 14MB │ ⋯    │
│ ☑ │ Cap 3  │ Batman    │ CBZ │ 30pg │ 20MB │ ⋯    │
│ ☑ │ Cap 4  │ Batman    │ CBZ │ 28pg │ 18MB │ ⋯    │
├──────────────────────────────────────────────────────┤
│ [Deletar selecionadas] [Mover para...] │  Pág 1/3  │
└──────────────────────────────────────────────────────┘
```

### Tela: Editor de Páginas (`/admin/medias/:id/pages`)

```
┌──────────────────────────────────────────────────────┐
│  ← Voltar │ Nightwing - Cap 21 │ 24 páginas         │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐      │
│  │     │  │     │  │ ☑   │  │     │  │ ☑   │      │
│  │  1  │  │  2  │  │  3  │  │  4  │  │  5  │      │
│  │     │  │     │  │     │  │     │  │     │      │
│  └─────┘  └─────┘  └─────┘  └─────┘  └─────┘      │
│  200x300  200x300  200x300  200x300  200x300        │
│                                                      │
│  ┌─────┐  ┌─────┐  ...                              │
│  │     │  │     │                                    │
│  │  6  │  │  7  │                                    │
│  └─────┘  └─────┘                                    │
│                                                      │
├──────────────────────────────────────────────────────┤
│ [Deletar 2 selecionadas] [Adicionar] [Dividir aqui] │
└──────────────────────────────────────────────────────┘
```

### Interações

1. **Clique na mídia** → Abre editor de páginas
2. **Drag & drop no grid** → Reordena (chama `/pages/reorder`)
3. **Seleciona + Deletar** → Remove páginas (chama `/pages/delete`)
4. **Clique direito numa página** → Menu: Substituir, Dividir aqui
5. **Botão Adicionar** → File picker + posição → (chama `/pages/add`)

---

## 🔗 Endpoints existentes que complementam

Estes endpoints **já existiam** e trabalham junto:

| Método | Rota                        | Descrição                                      |
| ------ | --------------------------- | ---------------------------------------------- |
| PUT    | `/admin/media/:id`          | Editar metadados (title, number, volume, year) |
| DELETE | `/admin/media/:id`          | Deletar um capítulo + arquivo                  |
| POST   | `/admin/media/:id/reassign` | Mover para outra série (single)                |
| PUT    | `/admin/series/:id`         | Editar metadados da série                      |
| DELETE | `/admin/series/:id`         | Deletar série + arquivos                       |
| POST   | `/admin/series/bulk-delete` | Deletar múltiplas séries                       |
| POST   | `/admin/series/merge`       | Merge de duas séries                           |
| GET    | `/admin/series`             | Listar séries (para dropdowns)                 |
| GET    | `/read/:id/page/:page`      | Servir página em alta qualidade (leitor)       |

> **Nota:** Os endpoints antigos usam `/admin/media/:id` (singular). Os novos usam `/admin/medias/...` (plural). Ambos funcionam.
