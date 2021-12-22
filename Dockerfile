FROM node:17-alpine as builder
WORKDIR /usr/src/sleep-tracker
COPY package.json yarn.lock ./
# https://github.com/yarnpkg/yarn/issues/749
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn compile

FROM node:17-alpine
WORKDIR /usr/src/sleep-tracker
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production && yarn cache clean
COPY --from=builder /usr/src/sleep-tracker/build ./build
EXPOSE 8000
ENTRYPOINT ["yarn", "start"]
