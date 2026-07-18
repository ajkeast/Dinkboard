FROM node:20-alpine

WORKDIR /app

# Workspace install from repo root (single lockfile)
COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm ci -w server --omit=dev

COPY server ./server
WORKDIR /app/server

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["npm", "start"]
