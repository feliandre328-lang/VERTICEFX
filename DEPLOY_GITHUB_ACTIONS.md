# Deploy com GitHub Actions (Host proprio via SSH)

Este projeto agora usa workflow em:

- `.github/workflows/deploy-frontend-host.yml`

Ele faz:

1. build do frontend (`npm ci` + `npm run build`)
2. upload da pasta `frontend/dist/` para seu servidor via SSH/rsync

## Secrets necessarios

Em `Settings -> Secrets and variables -> Actions`, configure:

- `SSH_PRIVATE_KEY` (chave privada para acesso no host)
- `DEPLOY_HOST` (ou `HOST_NAME` / `HOSTNAME`)
- `DEPLOY_USER` (ou `HOST_USER` / `SSH_USER`)
- `DEPLOY_PORT` (opcional, default `22`)
- `DEPLOY_PATH` (opcional, default `/var/www/verticefx`)

Variaveis de build frontend:

- `VITE_API_BASE`
- `VITE_PIX_KEY`
- `VITE_PIX_MERCHANT_NAME`
- `VITE_PIX_MERCHANT_CITY`

Opcional:

- `DEPLOY_POST_CMD` (comando remoto apos upload, ex: `sudo systemctl reload nginx`)

## Publicar

Push na `main`:

```bash
git add .
git commit -m "chore: deploy frontend to host via github actions"
git push origin main
```

Ou rode manualmente em `Actions -> Deploy Frontend to Host (SSH)`.
