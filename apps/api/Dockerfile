FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/content-management/package.json apps/content-management/package.json
COPY apps/unified-learning/package.json apps/unified-learning/package.json
COPY packages/content-schema/package.json packages/content-schema/package.json
RUN npm ci

COPY apps/api apps/api
COPY packages/content-schema packages/content-schema
RUN npm run build -w @edullm/content-schema && npm run build -w @edullm/api

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/node_modules node_modules
COPY --from=build /app/package.json package.json
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/src/db/schema.sql apps/api/src/db/schema.sql
COPY --from=build /app/packages/content-schema packages/content-schema

RUN mkdir -p /app/storage/uploads && chown -R node:node /app
USER node
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]

