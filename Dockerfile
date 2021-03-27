FROM node:15

# Create app directory
WORKDIR /usr/src/wow_cpc

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

WORKDIR /usr/src/wow_cpc/client

COPY client/package*.json ./

RUN npm install

WORKDIR /usr/src/wow_cpc

COPY . .

RUN chown -R node ./

ENV LOG_LEVEL=debug
ENV SERVER_PORT=3001
ENV CACHE_DB_FN=./databases/cache.db
ENV HISTORY_DB_FN=./databases/historical_auctions.db
ENV DATABASE_TYPE=sqlite3

USER node

RUN npm run fill-cache

ENV STANDALONE_CONTAINER=standalone

CMD ["node","server.js"]