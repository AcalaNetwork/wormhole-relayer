FROM node:22-alpine AS relayer
LABEL maintainer="hello@acala.network"

USER node

RUN mkdir /home/node/app

WORKDIR /home/node/app

COPY --chown=node:node package.json yarn.lock .yarnrc.yml ./
COPY --chown=node:node .yarn ./.yarn

RUN yarn install --frozen-lockfile

COPY . .

RUN yarn build
RUN yarn db:gen

CMD ["node", "dist/index.js"]
