FROM node:17-alpine AS client-build
WORKDIR /usr/src/build
RUN mkdir client
COPY client/package*.json ./client/
RUN mkdir src
RUN cd client && npm ci && cd ..
COPY ["src/worldofwarcraft_craftingprofitcalculator.d.ts","src/BlizzardApiTypes.d.ts", "./src/"]
COPY client/ ./client/
RUN cd client && npm run build

FROM alpine AS zip-build
WORKDIR /usr/src/build
RUN apk --no-cache add zip
COPY ./wow-addon .
RUN zip -r ./CraftingProfitCalculator_data.zip ./CraftingProfitCalculator_data

FROM node:17-alpine
# Add Curl for healthcheck
RUN apk --no-cache add curl
ENV LOG_LEVEL=debug SERVER_PORT=8080 CACHE_DB_FN="./databases/cache.db" HISTORY_DB_FN="./databases/historical_auctions.db" DATABASE_TYPE="sqlite3" STANDALONE_CONTAINER="standalone" DOCKERIZED="true"
# Create app directory
WORKDIR /usr/src/wow_cpc
COPY package*.json ./
RUN npm ci
COPY ./html ./html
COPY --from=client-build /usr/src/build/client/build ./html/build
COPY --from=zip-build /usr/src/build/CraftingProfitCalculator_data.zip ./html/CraftingProfitCalculator_data.zip
COPY ["./tsconfig.json","./LICENSE", "./"]
COPY ./cache ./cache
COPY ./src ./src
RUN npm run build
RUN mkdir databases
RUN chown -R node ./databases
VOLUME /usr/src/wow_cpc/databases
EXPOSE 8080
# Health Check
HEALTHCHECK --interval=5m --timeout=3s \
  CMD curl -f http://localhost:8080/healthcheck || exit 1
#USER node
CMD ["node","./dist/server.js"]