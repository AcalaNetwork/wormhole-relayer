FROM node:18-alpine as relayer
LABEL maintainer="hello@acala.network"

USER node

RUN mkdir /home/node/app

WORKDIR /home/node/app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build
RUN yarn db:gen

CMD node dist/index.js