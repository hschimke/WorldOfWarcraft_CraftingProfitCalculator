FROM node:15-alpine

ENV LOG_LEVEL=debug SERVER_PORT=8080 CACHE_DB_FN="./databases/cache.db" HISTORY_DB_FN="./databases/historical_auctions.db" DATABASE_TYPE=sqlit3 STANDALONE_CONTAINER=standalone DOCKERIZED=true

# Create app directory
WORKDIR /usr/src/wow_cpc

COPY package*.json ./

WORKDIR /usr/src/wow_cpc/client

COPY client/package*.json ./

WORKDIR /usr/src/wow_cpc

RUN npm ci && cd client && npm ci

WORKDIR /usr/src/wow_cpc

COPY . .

WORKDIR /usr/src/wow_cpc/client
RUN npm run build && mv ./build ../html

WORKDIR /usr/src/wow_cpc

RUN mkdir databases
RUN chown -R node ./databases
VOLUME /usr/src/wow_cpc/databases

EXPOSE 8080

USER node

CMD ["node","server.js"]
