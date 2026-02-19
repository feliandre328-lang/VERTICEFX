# Deploy com GitHub Actions (Host proprio via SSH)

Este projeto agora usa workflow em:

- `.github/workflows/deploy-frontend-host.yml`

Ele faz:

1. build do frontend (`npm ci` + `npm run build`)
2. upload da pasta `frontend/dist/` para seu servidor via SSH/rsync

## Secrets necessarios

Em `Settings -> Secrets and variables -> Actions`, configure (nomes que voce ja tem):

- `SSH_KEY` (chave privada para acesso no host)
- `SSH_HOST`
- `SSH_PORT` (opcional, default `22`)
- `REPO_SSH_URL` (fallback para extrair usuario/host, ex: `git@seu-host:repo.git`)

Tambem aceitos como fallback:
- `SSH_PRIVATE_KEY`
- `DEPLOY_HOST` / `HOST_NAME` / `HOSTNAME`
- `SSH_USER` / `DEPLOY_USER` / `HOST_USER`
- `DEPLOY_PORT`
- `DEPLOY_PATH` (opcional, default `/var/www/verticefx`)

Se nao tiver `SSH_USER`, o workflow tenta extrair de `REPO_SSH_URL`.

Opcional:
- `DEPLOY_PATH` (opcional, default `/var/www/verticefx`)

Variaveis de build frontend:

- `VITE_API_BASE`
- `VITE_PIX_KEY`
- `VITE_PIX_MERCHANT_NAME`
- `VITE_PIX_MERCHANT_CITY`

- `DEPLOY_POST_CMD` (comando remoto apos upload, ex: `sudo systemctl reload nginx`)

## Publicar

Push na `dev`:

```bash
git add .
git commit -m "chore: deploy frontend to host via github actions"
git push origin dev
```

Ou rode manualmente em `Actions -> Deploy Frontend to Host (SSH)`.
