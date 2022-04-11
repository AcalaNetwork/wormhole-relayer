FROM node:16-alpine as relayer
LABEL maintainer="hello@acala.network"

USER node

RUN mkdir /home/node/app

WORKDIR /home/node/app

COPY package.json yarn.lock ./

RUN yarn

COPY . .

CMD yarn start