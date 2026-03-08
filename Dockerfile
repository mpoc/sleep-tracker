FROM oven/bun:1.3-alpine AS build
WORKDIR /usr/src/sleep-tracker
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
COPY . .
RUN bun build --compile --asset-naming="[name].[ext]" src/index.ts ./src/static/*.png ./src/static/*.ico ./src/static/*.webmanifest --outfile server

FROM alpine
RUN apk add --no-cache libgcc libstdc++
LABEL org.opencontainers.image.source=https://github.com/mpoc/sleep-tracker
WORKDIR /usr/src/sleep-tracker
COPY --from=build /usr/src/sleep-tracker/server ./server
EXPOSE 8000
ENTRYPOINT ["./server"]
