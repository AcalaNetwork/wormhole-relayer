FROM node:16-alpine as relayer
LABEL maintainer="hello@acala.network"

RUN mkdir -p /app
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn

COPY . .

USER node
CMD yarn start
