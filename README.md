# Bola de Ouro 2026 · Backend

API da enquete **não oficial** da Bola de Ouro 2026 (temporada 2025/26) com os 30 indicados: NestJS + GraphQL + TypeORM sobre Postgres (Neon).

- Frontend + BFF: [frontend-golden-ball](../frontend-golden-ball)
- Fluxo: `navegador → BFF (/api/poll/*) → este backend (/graphql) → Postgres`

## Rodando localmente

```bash
cp .env.example .env.development   # preencha DATABASE_URL (e, se quiser, os segredos)
npm install
npm run start:dev                  # as migrations rodam sozinhas ao iniciar
```

Para votar localmente, preencha `GOOGLE_CLIENT_ID` (o mesmo `VITE_GOOGLE_CLIENT_ID` do frontend).

Gere segredos com `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.

## API (GraphQL)

| Operação                 | Tipo     | Descrição                                                        |
| ------------------------ | -------- | ---------------------------------------------------------------- |
| `candidates`             | Query    | Os 30 indicados (ordem oficial)                                  |
| `pollResults`            | Query    | Totais e % por indicado                                          |
| `pollAnalytics`          | Query    | Análise por período (`from`, `to`, `granularity`)                |
| `signInWithGoogle`       | Mutation | Troca o ID token do Google por uma sessão de votação             |
| `currentVoter`           | Query    | Quem está logado e se já votou (requer `Authorization: Bearer`)  |
| `castVote`               | Mutation | Registra o voto da conta Google logada                           |
| `playerStatsLeaderboard` | Query    | Os 30 indicados lado a lado na temporada, com filtros            |
| `nomineeSeasonStats`     | Query    | Temporada de um indicado: por competição, por time e jogo a jogo |

### Filtros de `pollAnalytics`

Todos opcionais, aplicados em memória sobre uma única contagem em cache — não geram consultas extras ao banco.

| Campo         | Valores                                                    |
| ------------- | ---------------------------------------------------------- |
| `from` / `to` | ISO 8601 com fuso (`2026-10-24T00:00:00-03:00`)            |
| `granularity` | `HOUR`, `DAY` (padrão: hora até 72h de período, dia acima) |

### Filtros das estatísticas

| Campo                        | Valores                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `scope`                      | `ALL`, `CLUB`, `LEAGUE`, `DOMESTIC_CUP`, `CONTINENTAL`, `NATIONAL_TEAM`                                                                |
| `competition`                | Nome exato da competição (ex.: `LaLiga`)                                                                                               |
| `position` (ranking)         | `Atacante`, `Meio-campista`, `Lateral`, `Zagueiro`                                                                                     |
| `minMinutes` (ranking)       | Minutos mínimos no recorte                                                                                                             |
| `sortBy` / `order` (ranking) | `GOALS`, `ASSISTS`, `GOAL_CONTRIBUTIONS`, `GAMES`, `MINUTES`, `GOALS_PER_90`, `CONTRIBUTIONS_PER_90`, `AVERAGE_RATING` / `ASC`, `DESC` |

## Regras de votação

- **Um voto por conta Google** (com e-mail verificado).
- **Encerramento:** `VOTING_CLOSES_AT` (padrão `2026-10-26T17:00:00-03:00`, dia da cerimônia). É um instante único para todo o país; depois dele, votos são recusados. Sempre informe o fuso.

## Login com Google

1. O frontend mostra o botão do Google só na hora de votar e envia o ID token ao BFF.
2. `signInWithGoogle` valida o token no servidor (assinatura, audiência = `GOOGLE_CLIENT_ID`, expiração e e-mail verificado) e devolve uma sessão JWT própria (`SESSION_SECRET`, validade `SESSION_TTL_SECONDS`).
3. O BFF guarda a sessão num cookie `httpOnly` e a envia como `Authorization: Bearer` em `castVote` e `currentVoter`.

No Google Cloud Console (Credenciais → ID do cliente OAuth → Aplicativo da Web), cadastre em **Origens JavaScript autorizadas** `http://localhost:5173` e o domínio de produção.

## Segurança e privacidade

- **Um voto por conta Google:** `UNIQUE` sobre o hash da conta, gravado na mesma transação do voto (resiste a requisições simultâneas).
- **Nenhum dado da conta armazenado:** só HMAC-SHA256 do id da conta Google com chave secreta (`VOTER_HASH_SECRET`). E-mail não é gravado; a sessão também não carrega e-mail nem o id bruto.
- **Voto secreto:** `tb_voters` (quem votou) e `tb_votes` (em quem) não têm ligação; o voto guarda só a hora truncada.
- **Anti-robô:** Cloudflare Turnstile, obrigatório em produção.
- **API fechada:** em produção só aceita chamadas do BFF (`INTERNAL_API_SECRET`). IPs só como HMAC.
- **Hardening:** helmet, corpo limitado a 10 KB, whitelist de campos, introspecção desligada em produção, erros internos não vazam, tokens redigidos de logs.

## Estatísticas dos indicados

Vêm da [Highlightly Football API](https://highlightly.net/football-api/) (RapidAPI, plano grátis de 100 requisições/dia):

- **Clubes:** totais da temporada `PLAYER_STATS_CLUB_SEASON` (`25/26`) por competição e clube.
- **Seleção:** box score de cada jogo da Copa do Mundo 2026 (`PLAYER_STATS_NATIONAL_LEAGUE_ID` / `PLAYER_STATS_NATIONAL_SEASON`) — nota, chutes, passes, dribles, duelos etc.

O site **nunca** chama o provedor: a API só lê as tabelas `tb_player_*`, preenchidas pela sincronização diária (`src/jobs/sync-player-stats.ts`):

- **Janela fechada** (`PLAYER_STATS_WINDOW_CLOSED=true`, padrão): a temporada e a Copa já acabaram, então os números são finais. O job só busca o que ainda falta e, depois de uma execução completa, para de chamar a API (as execuções seguintes custam zero requisições). Para uma nova janela, aponte as variáveis `PLAYER_STATS_*` para ela e use `false` para atualizar todo dia.
- **Agendamento:** workflow `sync-player-stats.yml` (GitHub Actions) às 10:00, 17:00 e 23:50 de Brasília. Enquanto a carga não termina, cada execução retoma de onde a anterior parou: cada box score é lido uma vez só e cada execução respeita `PLAYER_STATS_REQUEST_BUDGET`. Se uma falhar, a próxima completa; o site continua com os dados já gravados e avisa enquanto a carga estiver incompleta (`dataComplete: false`).
- **Histórico:** cada execução fica em `tb_stats_sync_runs` (`success`, `partial`, `failed`).
- **Manual:** `npm run stats:sync:dev` (local) ou "Run workflow" no GitHub (com `force` para ignorar a execução do dia).

## Migrations

Rodam no boot (local e produção) por `MigrationsRunnerService`, numa única transação protegida por `pg_advisory_xact_lock`. Assim, várias instâncias subindo juntas na Vercel não aplicam a mesma migration duas vezes, inclusive pelo endpoint _pooled_ do Neon. Desligue com `DB_MIGRATIONS_RUN=false`.

## Deploy (Vercel)

O workflow `deploy.yml` publica após o CI passar na `master`.

- **Secrets do GitHub:** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` e, para a sincronização das estatísticas, `DATABASE_URL` (o mesmo banco da produção) e `HIGHLIGHTLY_API_KEY`.
- **Variáveis de ambiente na Vercel:** `NODE_ENV=production`, `DATABASE_URL`, `FRONTEND_URL`, `VOTER_HASH_SECRET`, `INTERNAL_API_SECRET`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `TURNSTILE_SECRET_KEY` e `DB_SSL=true`.

> ⚠️ `VOTER_HASH_SECRET` nunca deve mudar depois que a votação começar: isso apagaria o controle de quem já votou.
