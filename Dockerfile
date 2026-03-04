FROM oven/bun:1.3-alpine AS build
WORKDIR /usr/src/sleep-tracker
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .
RUN bun build --compile src/index.ts --outfile server

FROM alpine
LABEL org.opencontainers.image.source=https://github.com/mpoc/sleep-tracker
WORKDIR /usr/src/sleep-tracker
COPY --from=build /usr/src/sleep-tracker/server ./server
COPY src/static ./src/static
EXPOSE 8000
ENTRYPOINT ["./server"]
