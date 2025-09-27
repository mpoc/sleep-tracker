FROM bun:1.2
LABEL org.opencontainers.image.source=https://github.com/mpoc/sleep-tracker
WORKDIR /usr/src/sleep-tracker
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production
EXPOSE 8000
ENTRYPOINT ["bun", "run", "src/index.ts"]
