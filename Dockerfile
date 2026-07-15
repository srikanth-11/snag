# Playwright base ships Chromium + all OS deps, matched to the npm playwright version.
FROM mcr.microsoft.com/playwright:v1.61.1-noble

ENV HOME=/app \
    NODE_ENV=production \
    PORT=7860 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Hugging Face Spaces run the container as uid 1000; make the app dir writable.
RUN chown -R 1000:0 /app && chmod -R g+rwX /app
USER 1000

EXPOSE 7860
CMD ["npm", "start", "--", "-H", "0.0.0.0", "-p", "7860"]
