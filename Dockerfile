FROM node:24-alpine

ENV TZ=Europe/Helsinki

WORKDIR /opt/app-root/src

COPY package* ./

RUN npm ci

COPY . .

CMD ["npm", "start"]
