# Bolão da Copa 2026 — fase de grupos



Aplicação web para preencher placares da **Copa do Mundo FIFA 2026** na fase de grupos (**72 jogos**, **48 seleções**, **12 grupos A–L**), ver a **classificação em tempo real** (pontos, saldo, gols pró) e **baixar uma planilha Excel** para enviar ao organizador do bolão. Confrontos conforme calendário oficial (mandante/visitante e data da rodada).



- **Frontend:** React (Vite) + TypeScript + SheetJS (`xlsx`)

- Sem login, sem banco de dados, sem backend

- Palpites salvos automaticamente no navegador (`localStorage`)



## Estrutura de pastas



```

worldcup/

├── client/

│   ├── src/

│   │   ├── components/     # GroupSection, MatchRow, StandingsTable, ExportForm

│   │   ├── config/         # Prazo de envio (bolao.ts)

│   │   ├── data/           # Grupos e jogos (groupStage.ts)

│   │   ├── lib/            # Tabela, export Excel, localStorage

│   │   ├── App.tsx

│   │   └── main.tsx

│   └── package.json

├── package.json

└── README.md

```



## Como rodar



### 1. Instalar dependências



Na raiz do projeto:



```bash

npm run install:all

```



Ou direto na pasta `client`:



```bash

cd client && npm install

```



### 2. Configurar prazo (opcional)



Copie o exemplo e edite com seus dados:



```bash

cd client

copy .env.example .env

```



No Linux/macOS use `cp .env.example .env`.



Variáveis:



- `VITE_SUBMISSION_DEADLINE` — prazo em texto livre (ex.: `11/06/2026`)



Sem `.env`, os valores padrão ficam em `client/src/config/bolao.ts`.



### 3. Subir a interface



Na raiz:



```bash

npm run dev

```



Ou:



```bash

cd client && npm run dev

```



Abra **http://localhost:5173** no navegador.



### 4. Build para publicar (Netlify, Cloudflare Pages, etc.)



```bash

npm run build

```



A pasta `client/dist` é o site estático. Basta fazer upload ou conectar o repositório ao host.



Com variáveis de ambiente no deploy, defina `VITE_SUBMISSION_DEADLINE` no painel do provedor antes do build.



## Fluxo do bolão



1. Compartilhe o link do site com os amigos.

2. Cada um preenche os 72 placares (progresso salvo no navegador).

3. Informa o nome, clica em **Baixar planilha Excel**.

4. Envia o arquivo `.xlsx` no WhatsApp do bolão.

5. A planilha traz aba **Info** (nome, data/hora, jogos preenchidos) e aba **Jogos** (todos os palpites) — ideal para auditoria.



---



**Copa 2026:** na competição real, os **dois primeiros** de cada grupo avançam, mais os **8 melhores terceiros**. Este bolão calcula só a **tabela dentro de cada grupo**; o destaque das duas primeiras linhas é visual. Critérios de ordenação no app: **pontos → saldo → gols pró** (desempates finos da FIFA entre 3+ times não estão replicados).

