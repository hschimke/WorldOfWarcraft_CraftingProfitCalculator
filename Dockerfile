FROM node:15

# Create app directory
WORKDIR /usr/src/wow_cpc

COPY --chown=node:node package*.json ./

WORKDIR /usr/src/wow_cpc/client

COPY --chown=node:node client/package*.json ./

WORKDIR /usr/src/wow_cpc

RUN npm install && cd client && npm install

WORKDIR /usr/src/wow_cpc

COPY --chown=node:node . .

WORKDIR /usr/src/wow_cpc/client
RUN npm run build && mv ./build ../html

WORKDIR /usr/src/wow_cpc

#RUN chown -R node ./

ENV LOG_LEVEL=debug SERVER_PORT=8080 CACHE_DB_FN="./databases/cache.db" HISTORY_DB_FN="./databases/historical_auctions.db" DATABASE_TYPE=sqlit3 STANDALONE_CONTAINER=standalone

RUN mkdir databases
RUN chown -R node ./databases
VOLUME ./databases

EXPOSE 8080

USER node

CMD ["node","server.js"]