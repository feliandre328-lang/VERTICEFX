#!/usr/bin/env bash
set -Eeuo pipefail

########################################
# CONFIGURAÇÕES
########################################

APP_DIR="/home/ubuntu/app"
BACKEND_DIR="${APP_DIR}/backend"
BRANCH="dev"                 # altere se usar master
VENV_PRIMARY="${APP_DIR}/backend_prod_venv"
VENV_LEGACY="${BACKEND_DIR}/backend_prod_venv"
VENV=""
DB_FILE="/home/ubuntu/data/db.sqlite3"
BACKUP_DIR="/home/ubuntu/backups"
LOCK_FILE="/tmp/deploy.lock"

########################################
# FUNÇÕES
########################################

log() {
  echo -e "\n\033[1;34m>>> $1\033[0m"
}

error_exit() {
  echo -e "\n\033[1;31mERRO: $1\033[0m"
  exit 1
}

resolve_venv() {
  if [ -d "$VENV_PRIMARY" ]; then
    VENV="$VENV_PRIMARY"
    if [ -d "$VENV_LEGACY" ]; then
      echo -e "\n\033[1;33mWARN: Venv legado encontrado em $VENV_LEGACY (ignorando)\033[0m"
    fi
    return
  fi

  if [ -d "$VENV_LEGACY" ]; then
    VENV="$VENV_LEGACY"
    echo -e "\n\033[1;33mWARN: Usando venv legado em $VENV. Recomendado mover para $VENV_PRIMARY\033[0m"
    return
  fi

  error_exit "Virtualenv nao encontrado em $VENV_PRIMARY nem em $VENV_LEGACY"
}

bootstrap_pip() {
  if ! python -m pip --version >/dev/null 2>&1; then
    log "pip corrompido ou ausente no venv. Reinstalando com ensurepip..."
    python -m ensurepip --upgrade || error_exit "Falha ao recuperar pip com ensurepip"
  fi

  python -m pip install --upgrade --force-reinstall pip setuptools wheel
}

########################################
# LOCK (evita dois deploys ao mesmo tempo)
########################################

if [ -f "$LOCK_FILE" ]; then
  error_exit "Outro deploy já está em execução."
fi

trap 'rm -f "$LOCK_FILE"' EXIT
touch "$LOCK_FILE"

########################################
# INÍCIO
########################################

log "1/9 - Verificando banco..."
echo "Banco alvo de producao: $DB_FILE"

[ -f "$DB_FILE" ] || error_exit "Banco não encontrado em $DB_FILE"

log "2/9 - Criando diretório de backup..."
mkdir -p "$BACKUP_DIR"

log "3/9 - Backup do SQLite..."
TS="$(date +%Y%m%d-%H%M%S)"
cp -a "$DB_FILE" "${BACKUP_DIR}/db.sqlite3.bak-${TS}"
echo "Backup salvo em: ${BACKUP_DIR}/db.sqlite3.bak-${TS}"

log "4/9 - Atualizando código (modo seguro)..."
cd "$APP_DIR"

git fetch origin
git reset --hard "origin/${BRANCH}"

log "5/9 - Ativando ambiente virtual..."
resolve_venv
source "${VENV}/bin/activate"

log "6/9 - Instalando dependências..."
bootstrap_pip
python -m pip install -r "${BACKEND_DIR}/requirements.txt"
log "7/9 - Modo sem banco: pulando migrations..."
cd "$BACKEND_DIR"
# Migrations desativadas para nao alterar o banco.

log "8/9 - Coletando arquivos estáticos..."
python manage.py collectstatic --noinput

log "9/9 - Reiniciando serviços..."
sudo systemctl restart gunicorn
sudo systemctl reload nginx

log "Verificando status dos serviços..."
sudo systemctl is-active --quiet gunicorn || error_exit "Gunicorn não está ativo!"
sudo systemctl is-active --quiet nginx || error_exit "Nginx não está ativo!"

log "Deploy concluído com sucesso."
echo "Banco preservado em: $DB_FILE"
