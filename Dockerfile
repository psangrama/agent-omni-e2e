# Runs the test suite (WebdriverIO or Playwright, chosen by TEST_ENGINE in your --env-file)
# in a container with Google Chrome installed. Both engines use this Chrome.
# Secrets are NOT baked in: pass them at run time with --env-file .env
FROM node:22-bookworm-slim

# Note: NODE_ENV is not set to "production", because npm ci would then skip the
# devDependencies (WebdriverIO, TypeScript) that the tests need.
ENV DEBIAN_FRONTEND=noninteractive \
    HEADLESS=true

# Google Chrome (stable) from Google's apt repository, plus fonts for readable screenshots.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg fonts-liberation \
 && curl -fsSL https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/google-chrome.gpg \
 && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends google-chrome-stable \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first so this layer is cached when only test code changes.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# Reports are written here; mount a folder to keep them on the host.
VOLUME ["/app/reports"]

# Default: the same command the GitHub workflow runs. Override with e.g. `npm run test:ci:smoke`.
CMD ["npm", "run", "test:ci"]
