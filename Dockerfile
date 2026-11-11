FROM node:26-alpine

ENV TZ=Europe/Helsinki

WORKDIR /opt/app-root/src

COPY package* ./

RUN npm ci

COPY . .

CMD ["npm", "start"]
