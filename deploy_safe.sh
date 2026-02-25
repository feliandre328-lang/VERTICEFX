#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/ubuntu/app"
BACKEND_DIR="${APP_DIR}/backend"
DB_FILE="${BACKEND_DIR}/db.sqlite3"
VENV="${APP_DIR}/backend_prod_venv"
BACKUP_DIR="/home/ubuntu/backups"

echo "[1/7] Checando banco..."
if [ ! -f "$DB_FILE" ]; then
  echo "ERRO: Banco não encontrado em $DB_FILE"
  exit 1
fi

echo "[2/7] Criando pasta de backup (se não existir)..."
mkdir -p "$BACKUP_DIR"

echo "[3/7] Backup do SQLite..."
TS="$(date +%Y%m%d-%H%M%S)"
cp -a "$DB_FILE" "${BACKUP_DIR}/db.sqlite3.bak-${TS}"
echo "Backup salvo em ${BACKUP_DIR}/db.sqlite3.bak-${TS}"

echo "[4/7] Atualizando código..."
cd "$APP_DIR"
git pull

echo "[5/7] Instalando dependências..."
cd "$BACKEND_DIR"
source "${VENV}/bin/activate"
pip install -r requirements.txt

echo "[6/7] Migrate e static..."
python manage.py migrate --noinput
python manage.py collectstatic --noinput

echo "[7/7] Reiniciando serviços..."
sudo systemctl restart gunicorn
sudo systemctl reload nginx

echo "Deploy concluído com sucesso."
echo "Banco preservado em: $DB_FILE"