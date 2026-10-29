FROM node:22.21.1-bookworm-slim

# Python sidecar (receipt deskew + report), LibreOffice (xlsx→pdf), poppler (pdf→png), fonts the scripts look for.
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-venv libreoffice-calc poppler-utils fonts-dejavu-core fonts-liberation ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Receipt auto-read shells out to the claude CLI.
RUN npm i -g @anthropic-ai/claude-code@2.1.303

WORKDIR /app
COPY server/python/requirements.txt server/python/requirements.txt
RUN python3 -m venv server/python/.venv && server/python/.venv/bin/pip install --no-cache-dir -r server/python/requirements.txt

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# The container runs as root; the claude CLI refuses bypassPermissions as root without IS_SANDBOX.
# MQX_DB_PATH is a Railway variable so the data folder can be switched without a rebuild.
ENV NODE_ENV=production \
    PYTHON_BIN=/app/server/python/.venv/bin/python \
    IS_SANDBOX=1
CMD ["node_modules/.bin/tsx", "server/index.ts"]
