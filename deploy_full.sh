#!/usr/bin/env bash
set -euo pipefail

########################################
# CONFIG
########################################
APP_DIR="/home/ubuntu/app"
BACKEND_DIR="${APP_DIR}/backend"
FRONTEND_DIR="${APP_DIR}/frontend"

# ✅ MESMO VENV do gunicorn.service (ExecStart)
VENV="${BACKEND_DIR}/backend_prod_venv"

DB_FILE="/home/ubuntu/data/db.sqlite3"
BACKUP_DIR="/home/ubuntu/backups"

GUNICORN_SERVICE="gunicorn"
NGINX_SERVICE="nginx"

########################################
# HELPERS
########################################
log(){ echo -e "\n\033[1;32m[OK]\033[0m $*"; }
warn(){ echo -e "\n\033[1;33m[WARN]\033[0m $*"; }
die(){ echo -e "\n\033[1;31m[ERR]\033[0m $*"; exit 1; }

########################################
# PRECHECKS
########################################
log "Checando diretórios..."
[ -d "$APP_DIR" ] || die "APP_DIR não existe: $APP_DIR"
[ -d "$BACKEND_DIR" ] || die "BACKEND_DIR não existe: $BACKEND_DIR"
[ -d "$FRONTEND_DIR" ] || die "FRONTEND_DIR não existe: $FRONTEND_DIR"
[ -d "$VENV" ] || die "VENV do gunicorn não existe: $VENV"

if [ -d "${BACKEND_DIR}/backend_prod_venv" ]; then
  warn "Existe um venv duplicado em ${BACKEND_DIR}/backend_prod_venv (evite confusão). O deploy usará: $VENV"
fi

log "Checando banco..."
[ -f "$DB_FILE" ] || die "Banco não encontrado em: $DB_FILE (abortando para não criar SQLite vazio)"

log "Checando git..."
command -v git >/dev/null 2>&1 || die "git não encontrado"
cd "$APP_DIR"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || die "APP_DIR não parece ser um repositório git: $APP_DIR"

log "Checando npm..."
command -v npm >/dev/null 2>&1 || die "npm não encontrado"

########################################
# 1) BACKUP SQLITE
########################################
log "Criando pasta de backups..."
mkdir -p "$BACKUP_DIR"

TS="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/db.sqlite3.bak-${TS}"

log "Fazendo backup do SQLite: ${BACKUP_FILE}"
cp -a "$DB_FILE" "$BACKUP_FILE"

########################################
# 2) PULL CODE
########################################
log "Atualizando código (git pull)..."
cd "$APP_DIR"
git pull

########################################
# 3) BACKEND DEPLOY
########################################
log "Backend: ativando venv do gunicorn..."
# shellcheck disable=SC1090
source "${VENV}/bin/activate"

log "Backend: instalando dependências..."
cd "$BACKEND_DIR"
pip install -r requirements.txt

log "Backend: migrate..."
python manage.py migrate --noinput

log "Backend: collectstatic..."
python manage.py collectstatic --noinput

log "Backend: restart gunicorn..."
sudo systemctl restart "$GUNICORN_SERVICE"

########################################
# 4) FRONTEND DEPLOY
########################################
log "Frontend: instalando dependências..."
cd "$FRONTEND_DIR"

if [ -f "package-lock.json" ]; then
  log "Frontend: package-lock.json encontrado -> npm ci"
  npm ci
else
  warn "Frontend: package-lock.json NÃO encontrado -> npm install (recomendado commitar o lock depois)"
  npm install
fi

log "Frontend: build..."
npm run build

log "Frontend: reload nginx..."
sudo systemctl reload "$NGINX_SERVICE"

########################################
# DONE
########################################
log "Deploy completo finalizado."
log "Banco ativo preservado em: $DB_FILE"
log "Backup criado em: $BACKUP_FILE"