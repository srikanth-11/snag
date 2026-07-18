# Playwright base ships Chromium + all OS deps, matched to the npm playwright version.
FROM mcr.microsoft.com/playwright:v1.61.1-noble

ENV HOME=/app \
    NODE_ENV=production \
    PORT=7860 \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
WORKDIR /app

COPY package*.json ./
# NODE_ENV=production would make npm skip devDependencies, but the build needs
# them (tailwind, postcss, typescript). Force-include dev deps for the build.
RUN npm ci --include=dev

# NEXT_PUBLIC_* are inlined into the browser bundle at build time, so they must be
# present during `npm run build`. On Hugging Face, set these as Space *Variables*
# (they are public values, not secrets) so they arrive here as build args.
ARG NEXT_PUBLIC_SUPABASE_URL=""
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=""
ARG NEXT_PUBLIC_SITE_URL=""
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

COPY . .
RUN npm run build

# Run as a non-root uid and make the app dir writable (Next needs a writable
# cache dir at runtime).
RUN chown -R 1000:0 /app && chmod -R g+rwX /app
USER 1000

EXPOSE 7860
# Shell form so $PORT (set by Render and most hosts) is honoured; falls back to 7860.
CMD npm start -- -H 0.0.0.0 -p ${PORT:-7860}
