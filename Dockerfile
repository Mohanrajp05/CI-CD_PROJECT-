# Stage 1: Build dependencies & code checks
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY . .

# Stage 2: Minimal runtime image
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /usr/src/app/index.js ./index.js
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/public ./public

# Receive git commit SHA during build time
ARG GIT_SHA
ENV GIT_SHA=${GIT_SHA:-dev-local-commit}
ENV PORT=3000

EXPOSE 3000

CMD ["node", "index.js"]
