#!/usr/bin/env bash
set -Eeuo pipefail

########################################
# CONFIG (EDITE AQUI)
########################################
APP_USER="ubuntu"
APP_HOME="/home/${APP_USER}"
APP_DIR="${APP_HOME}/app"

APP_REPO="https://github.com/feliandre328-lang/VERTICEFX.git"
APP_BRANCH="dev"

BACKEND_DIR="backend"
FRONTEND_DIR="frontend"

DJANGO_WSGI="config.wsgi:application"
DJANGO_SETTINGS_FILE="${APP_DIR}/${BACKEND_DIR}/config/settings.py"

SERVER_NAME="3.134.106.62"
DOMAINS_FOR_SSL="www.verticefx.com.br verticefx.com.br" # domínios para HTTPS automático
SSL_EMAIL="andressa.anthero7@gmail.com"
ENABLE_SSL_NOW="0" # 1 = roda certbot agora | 0 = deixa para depois

VENV_DIR="${APP_DIR}/backend_prod_venv"
ENV_FILE="${APP_DIR}/.env"

GUNICORN_WORKERS="3"
GUNICORN_TIMEOUT="120"

NODE_MAJOR="20"
########################################

log(){ echo -e "\n\033[1;32m[OK]\033[0m $*"; }
warn(){ echo -e "\n\033[1;33m[WARN]\033[0m $*"; }
die(){ echo -e "\n\033[1;31m[ERRO]\033[0m $*"; exit 1; }

need_root(){
  [[ "${EUID}" -eq 0 ]] || die "Rode como root: sudo bash deploy_rebuild.sh"
}

ensure_user(){
  id "${APP_USER}" >/dev/null 2>&1 || die "Usuario ${APP_USER} nao existe."
}

apt_install(){
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y "$@"
}

install_node(){
  if command -v node >/dev/null 2>&1; then
    log "Node ja instalado: $(node -v)"
    return
  fi
  log "Instalando Node.js ${NODE_MAJOR}..."
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt_install nodejs
  log "Node instalado: $(node -v) / npm: $(npm -v)"
}

clone_or_update_repo(){
  mkdir -p "${APP_DIR}"
  chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}"

  if [[ -d "${APP_DIR}/.git" ]]; then
    log "Repo ja existe, atualizando branch ${APP_BRANCH}..."
    sudo -u "${APP_USER}" bash -lc "
      cd '${APP_DIR}' &&
      git fetch origin '${APP_BRANCH}' &&
      git checkout '${APP_BRANCH}' &&
      git reset --hard 'origin/${APP_BRANCH}' &&
      git clean -fd -e '.env'
    "
  else
    if [[ -n "$(find "${APP_DIR}" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null || true)" ]]; then
      warn "APP_DIR sem .git detectado. Limpando conteudo antigo (preserva .env)..."
      find "${APP_DIR}" -mindepth 1 -maxdepth 1 \
        ! -name ".env" \
        -exec rm -rf {} +
    fi

    log "Clonando repo..."
    sudo -u "${APP_USER}" bash -lc "
      git clone --branch '${APP_BRANCH}' --single-branch '${APP_REPO}' '${APP_DIR}'
    "
  fi

  [[ -d "${APP_DIR}/${BACKEND_DIR}" ]] || die "Backend nao encontrado em ${APP_DIR}/${BACKEND_DIR}"
  [[ -d "${APP_DIR}/${FRONTEND_DIR}" ]] || die "Frontend nao encontrado em ${APP_DIR}/${FRONTEND_DIR}"
  log "Repo OK em ${APP_DIR}"
}

make_env(){
  if [[ -f "${ENV_FILE}" ]]; then
    warn ".env ja existe, mantendo: ${ENV_FILE}"
    return
  fi

  log "Criando .env inicial em ${ENV_FILE}"
  cat > "${ENV_FILE}" <<EOF
DJANGO_SETTINGS_MODULE=config.settings
DJANGO_SECRET_KEY=troque-isto
DJANGO_DEBUG=0
DJANGO_ALLOWED_HOSTS=${SERVER_NAME},localhost,127.0.0.1
DJANGO_CSRF_TRUSTED_ORIGINS=http://${SERVER_NAME}
MP_ACCESS_TOKEN=
PIX_BR_CODE=
EOF
  chown "${APP_USER}:${APP_USER}" "${ENV_FILE}"
  chmod 600 "${ENV_FILE}"
}

patch_django_settings_for_env(){
  [[ -f "${DJANGO_SETTINGS_FILE}" ]] || die "Arquivo nao encontrado: ${DJANGO_SETTINGS_FILE}"

  if grep -q "VERTICEFX_PROD_OVERRIDES" "${DJANGO_SETTINGS_FILE}"; then
    log "settings.py ja contem overrides de producao."
    return
  fi

  log "Aplicando overrides de producao em settings.py..."
  cat >> "${DJANGO_SETTINGS_FILE}" <<'PYCONF'

# ---- VERTICEFX_PROD_OVERRIDES (auto) ----
import os
from pathlib import Path

def _env_bool(name, default=False):
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}

DEBUG = _env_bool("DJANGO_DEBUG", False)
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", SECRET_KEY)

_allowed_hosts = os.getenv("DJANGO_ALLOWED_HOSTS", "")
if _allowed_hosts.strip():
    ALLOWED_HOSTS = [h.strip() for h in _allowed_hosts.split(",") if h.strip()]

_csrf_origins = os.getenv("DJANGO_CSRF_TRUSTED_ORIGINS", "")
if _csrf_origins.strip():
    CSRF_TRUSTED_ORIGINS = [o.strip() for o in _csrf_origins.split(",") if o.strip()]

STATIC_URL = "/static/"
STATIC_ROOT = str(Path(BASE_DIR) / "staticfiles")
MEDIA_URL = "/media/"
MEDIA_ROOT = str(Path(BASE_DIR) / "media")
# ---- /VERTICEFX_PROD_OVERRIDES ----
PYCONF
}

full_rebuild_cleanup(){
  log "Rebuild completo: limpando ambiente Python e artefatos frontend..."

  rm -rf "${VENV_DIR}" || true
  rm -rf "${APP_DIR}/${FRONTEND_DIR}/node_modules" || true
  rm -rf "${APP_DIR}/${FRONTEND_DIR}/dist" || true

  # Limpa staticfiles gerado para evitar resquicios de build anterior.
  rm -rf "${APP_DIR}/${BACKEND_DIR}/staticfiles" || true

  log "Cleanup concluido (banco de dados nao foi alterado)."
}

setup_backend(){
  log "Instalando deps do sistema p/ Python..."
  apt_install python3 python3-venv python3-pip python3-dev build-essential pkg-config

  log "Criando venv limpo em ${VENV_DIR}..."
  sudo -u "${APP_USER}" bash -lc "python3 -m venv '${VENV_DIR}'"

  log "Instalando dependencias do backend..."
  sudo -u "${APP_USER}" bash -lc "
    source '${VENV_DIR}/bin/activate' &&
    pip install --upgrade pip wheel setuptools &&
    if [[ -f '${APP_DIR}/${BACKEND_DIR}/requirements_prod.txt' ]]; then
      pip install -r '${APP_DIR}/${BACKEND_DIR}/requirements_prod.txt'
    elif [[ -f '${APP_DIR}/${BACKEND_DIR}/requirements.txt' ]]; then
      pip install -r '${APP_DIR}/${BACKEND_DIR}/requirements.txt'
    else
      echo 'requirements do backend nao encontrados.' >&2
      exit 1
    fi
  "

  patch_django_settings_for_env

  log "Rodando migrate + collectstatic..."
  sudo -u "${APP_USER}" bash -lc "
    source '${VENV_DIR}/bin/activate' &&
    export DJANGO_SETTINGS_MODULE=config.settings &&
    cd '${APP_DIR}/${BACKEND_DIR}' &&
    python manage.py migrate --noinput &&
    python manage.py collectstatic --noinput
  "
}

setup_frontend(){
  install_node

  log "Instalando deps e gerando build do frontend..."
  sudo -u "${APP_USER}" bash -lc "
    cd '${APP_DIR}/${FRONTEND_DIR}' &&
    npm ci &&
    npm run build
  "

  [[ -d "${APP_DIR}/${FRONTEND_DIR}/dist" ]] || die "Build nao gerou dist/ em ${FRONTEND_DIR}"
  log "Frontend build OK: ${APP_DIR}/${FRONTEND_DIR}/dist"
}

write_gunicorn_service(){
  log "Configurando Gunicorn (systemd)..."

  cat > /etc/systemd/system/gunicorn.service <<EOF
[Unit]
Description=Gunicorn (Django VERTICEFX)
After=network.target

[Service]
User=${APP_USER}
Group=www-data
WorkingDirectory=${APP_DIR}/${BACKEND_DIR}
EnvironmentFile=${ENV_FILE}
Environment=DJANGO_SETTINGS_MODULE=config.settings
RuntimeDirectory=gunicorn
RuntimeDirectoryMode=0755
UMask=007

ExecStart=${VENV_DIR}/bin/gunicorn \
  --access-logfile - \
  --error-logfile - \
  --log-level info \
  --workers ${GUNICORN_WORKERS} \
  --timeout ${GUNICORN_TIMEOUT} \
  --bind unix:/run/gunicorn/gunicorn.sock \
  ${DJANGO_WSGI}

Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable --now gunicorn
  systemctl restart gunicorn

  sleep 1
  [[ -S /run/gunicorn/gunicorn.sock ]] || {
    journalctl -u gunicorn -n 120 --no-pager || true
    systemctl status gunicorn --no-pager -l || true
    die "Gunicorn nao criou /run/gunicorn/gunicorn.sock"
  }
  log "Gunicorn OK"
}

write_nginx_site(){
  log "Instalando/configurando Nginx..."
  apt_install nginx

  cat > /etc/nginx/sites-available/app <<EOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    root ${APP_DIR}/${FRONTEND_DIR}/dist;
    index index.html;

    location /assets/ {
        try_files \$uri =404;
        access_log off;
        expires 30d;
    }

    location /static/ {
        alias ${APP_DIR}/${BACKEND_DIR}/staticfiles/;
        access_log off;
        expires 30d;
    }

    location /media/ {
        alias ${APP_DIR}/${BACKEND_DIR}/media/;
        access_log off;
        expires 30d;
    }

    location /api/ {
        proxy_pass http://unix:/run/gunicorn/gunicorn.sock:;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
    }

    location /admin/ {
        proxy_pass http://unix:/run/gunicorn/gunicorn.sock:;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
    }

    location / {
        try_files \$uri /index.html;
    }
}
EOF

  rm -f /etc/nginx/sites-enabled/default || true
  ln -sf /etc/nginx/sites-available/app /etc/nginx/sites-enabled/app

  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx

  log "Nginx OK"
}

install_ssl_if_requested(){
  if [[ -z "${DOMAINS_FOR_SSL}" ]]; then
    warn "DOMAINS_FOR_SSL vazio -> sem HTTPS automatico."
    return
  fi

  log "Instalando Certbot e ativando SSL..."
  apt_install certbot python3-certbot-nginx

  # shellcheck disable=SC2086
  certbot --nginx -n --redirect --agree-tos --email "${SSL_EMAIL}" -d ${DOMAINS_FOR_SSL}

  systemctl reload nginx
  log "SSL ativado para: ${DOMAINS_FOR_SSL}"
}

main(){
  need_root
  ensure_user

  [[ "${APP_REPO}" != *"SEU_USUARIO/SEU_REPO"* ]] || die "Edite APP_REPO com seu repositorio real."

  log "Inicio do rebuild completo (preservando banco e .env)"
  apt_install curl git ca-certificates gnupg

  clone_or_update_repo
  make_env
  full_rebuild_cleanup
  setup_backend
  setup_frontend
  write_gunicorn_service
  write_nginx_site
  if [[ "${ENABLE_SSL_NOW}" == "1" ]]; then
    install_ssl_if_requested
  else
    warn "Certbot desativado por agora (ENABLE_SSL_NOW=0). Rode depois quando o DNS estiver pronto."
  fi

  log "FINALIZADO"
  echo
  echo "Teste:"
  echo "  curl -I http://${SERVER_NAME}/"
  echo "  curl -I http://${SERVER_NAME}/api/auth/token/"
  echo
  echo "Logs uteis:"
  echo "  sudo journalctl -u gunicorn -n 120 --no-pager"
  echo "  sudo tail -n 120 /var/log/nginx/error.log"
}

main "$@"