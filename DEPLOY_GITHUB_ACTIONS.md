# Deploy com GitHub Actions (Frontend)

Este projeto agora tem workflow em:

- `.github/workflows/deploy-frontend-pages.yml`

Ele faz:

1. build do frontend (`npm ci` + `npm run build`)
2. publish automático no GitHub Pages quando houver push em `main`

## 1) Ativar GitHub Pages no repositório

No GitHub:

1. `Settings`
2. `Pages`
3. Em `Source`, selecione `GitHub Actions`

## 2) Configurar Secrets do repositório

No GitHub:

1. `Settings`
2. `Secrets and variables` -> `Actions`
3. Criar os secrets abaixo:

- `VITE_API_BASE` (URL da sua API em produção, ex: `https://api.seudominio.com/api`)
- `VITE_PIX_KEY`
- `VITE_PIX_MERCHANT_NAME`
- `VITE_PIX_MERCHANT_CITY`

## 3) Publicar

Basta fazer push para `dev`:

```bash
git add .
git commit -m "chore: add github actions deploy"
git push origin dev
```

## URL final

Após o deploy, a URL fica em:

- `https://<seu-user>.github.io/<seu-repo>/`

Se usar domínio próprio, configure depois em `Settings -> Pages`.
