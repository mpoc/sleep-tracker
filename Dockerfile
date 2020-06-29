FROM node:14-alpine as builder
WORKDIR /usr/src/sleep-tracker
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn compile

FROM node:14-alpine
WORKDIR /usr/src/sleep-tracker
COPY package.json yarn.lock ./
RUN yarn install --production --pure-lockfile
COPY --from=builder /usr/src/sleep-tracker/build ./build
EXPOSE 8000
ENTRYPOINT ["yarn", "start"]
