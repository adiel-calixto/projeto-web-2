# Catálogo de jogos

API REST feita com Node.js e Express. Os jogos, os usuários e os registros de requisição são persistidos no MongoDB. As capas dos jogos ficam no Amazon S3.

## Executar

```sh
npm install
cp .env.example .env
npm start
```

Por padrão, a API fica em `http://localhost:3000`. Para usar outra porta, defina `PORT`.

O MongoDB é obrigatório. Por padrão a conexão usa `mongodb://127.0.0.1:27017/psw2`; defina `MONGODB_URI` para usar outro servidor/banco.

A aplicação não sobe sem `JWT_SECRET` (mínimo de 32 caracteres), `S3_BUCKET`, `AWS_REGION` e `S3_PUBLIC_BASE_URL`. SMTP e credenciais AWS também são necessários para enviar e-mails e gravar capas. Em produção na AWS, use IAM Role e deixe `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` vazios.

### Principais variáveis de ambiente

| Variável | Padrão | Uso |
| --- | --- | --- |
| `JWT_SECRET` | obrigatório | Segredo HS256 dos access tokens. |
| `JWT_ACCESS_EXPIRES_IN` | `15m` | Validade do access token. |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | Validade do refresh token. |
| `EMAIL_VERIFICATION_TTL_HOURS` | `24` | Validade do link de verificação. |
| `APP_BASE_URL` | `http://localhost:PORT` | Base do link enviado por e-mail. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | - | Envio de e-mail por SMTP. |
| `S3_BUCKET`, `AWS_REGION`, `S3_PUBLIC_BASE_URL` | obrigatórios | Armazenamento e URL pública das capas. |
| `S3_ENDPOINT`, `S3_FORCE_PATH_STYLE` | vazios | Opcionais para MinIO/LocalStack. |

Gere um segredo com:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Autenticação

O cadastro cria a conta como não verificada e envia um link por e-mail. O primeiro login só é permitido depois de acessar o link.

1. `POST /auth/cadastro` com `{name, email, password}`.
2. `GET /auth/verificar-email?token=...`, usando o link recebido.
3. `POST /auth/login` com `{email, password}` para receber `accessToken` e `refreshToken`.
4. Envie `Authorization: Bearer <accessToken>` nas rotas protegidas.

| Método | Rota | Auth | Corpo / query | Respostas |
| --- | --- | --- | --- | --- |
| `POST` | `/auth/cadastro` | não | `{name, email, password}` | `201`, `400`, `409`, `429` |
| `GET` | `/auth/verificar-email?token=` | não | token na query | `200`, `400` |
| `POST` | `/auth/reenviar-verificacao` | não | `{email}` | `202`, `429` |
| `POST` | `/auth/login` | não | `{email, password}` | `200`, `401`, `403`, `429` |
| `POST` | `/auth/refresh` | não | `{refreshToken}` | `200`, `401` |
| `POST` | `/auth/logout` | não | `{refreshToken}` | `204` |
| `GET` | `/auth/eu` | Bearer | - | `200`, `401` |

O refresh token é opaco, é armazenado como hash no banco e rotaciona a cada uso. Reutilizar um token já usado revoga todos os refresh tokens do usuário. O login responde do mesmo jeito para e-mail inexistente e senha errada.

As rotas `/auth` continuam disponíveis no fim de semana, inclusive para o link de verificação. A senha deve ter entre 8 e 72 caracteres.

## Jogos

| Método | Rota | Auth | Resultado |
| --- | --- | --- | --- |
| `GET` | `/jogos` | não | Lista os jogos, com `coverUrl` ou `null`. |
| `POST` | `/jogos` | Bearer | Cadastra um jogo e gera seu código. |
| `GET` | `/jogos/:codigo` | não | Pesquisa um jogo pelo código. |
| `DELETE` | `/jogos/:codigo` | Bearer | Exclui o jogo e sua capa do S3. |
| `PUT` | `/jogos/:codigo/capa` | Bearer | Envia uma capa em `multipart/form-data`, campo `capa`. |
| `DELETE` | `/jogos/:codigo/capa` | Bearer | Remove a capa do jogo e do S3. |
| `GET` | `/jogos/pdf` | não | Baixa o catálogo no arquivo `jogos.pdf`. |
| `GET` | `/requisicoes?data=YYYY-MM-DD` | não | Lista os registros daquela data. |

O corpo de `POST /jogos` deve ser JSON com `title`, `price` e `genre`:

```json
{
  "title": "Hades",
  "price": 49.9,
  "genre": "Ação"
}
```

O código é gerado no formato `G001`, `G002` e assim por diante. O preço deve ser um número não negativo com até duas casas decimais. Campos extras, incluindo `code` e `coverUrl`, são ignorados no cadastro.

A capa aceita JPEG, PNG ou WebP de até 5 MB. O tipo é verificado pelos bytes do arquivo, e a chave no S3 é gerada pelo servidor. A resposta traz a URL pública definitiva em `coverUrl`:

```json
{
  "code": "G001",
  "title": "Hades",
  "price": 49.9,
  "genre": "Ação",
  "coverUrl": "https://psw2-capas-dev.s3.sa-east-1.amazonaws.com/games/G001/3f1c9a2e-....png"
}
```

Exemplo de upload:

```sh
TOKEN=$(curl -s localhost:3000/auth/login -H 'content-type: application/json' \
  -d '{"email":"voce@exemplo.com","password":"senha-forte-123"}' | jq -r .accessToken)

curl -X PUT localhost:3000/jogos/G001/capa \
  -H "Authorization: Bearer $TOKEN" -F "capa=@./hades.png"
```

## Configurar o S3

O bucket precisa permitir leitura pública apenas em `games/*`; a escrita continua restrita à API. Exemplo de bucket policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LeituraPublicaDasCapas",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::SEU-BUCKET/games/*"
    }
  ]
}
```

A policy do usuário/IAM usado pela API precisa apenas de `s3:PutObject` e `s3:DeleteObject` no mesmo prefixo. No console da AWS, desmarque as opções de Block Public Access relacionadas a políticas e mantenha as de ACL ligadas. Se usar CloudFront, o bucket pode ficar totalmente privado e `S3_PUBLIC_BASE_URL` passa a ser o domínio da distribuição; nenhuma outra mudança de código é necessária.

Para desenvolvimento sem AWS, aponte `S3_ENDPOINT` para um MinIO/LocalStack, use `S3_FORCE_PATH_STYLE=true` e ajuste `S3_PUBLIC_BASE_URL` (por exemplo, `http://localhost:9000/psw2-capas-dev`).

## Regras de acesso e testes

A API de jogos e de requisições permite acesso de segunda a sexta-feira, conforme o fuso `America/Fortaleza`. As rotas de `/auth` ficam fora desse bloqueio para que verificação e login funcionem todos os dias. Todas as requisições são registradas com horário, método e caminho; a query string não é gravada, então o token de verificação não vai para os logs.

Em produção, use HTTPS e configure `app.set('trust proxy', 1)` caso a API fique atrás de um proxy, para o rate limit enxergar o IP real.

Os testes usam Jest e não precisam de MongoDB, SMTP nem AWS: as stores, o mailer e o storage são fakes injetados em `createApp`.

```sh
npm test          # todos os testes
npm run test:unit # apenas testes unitários
npm run test:e2e  # apenas testes e2e (supertest)
```
