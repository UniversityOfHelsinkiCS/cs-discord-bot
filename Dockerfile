FROM node:24-alpina

ENV TZ=Europe/Helsinki

WORKDIR /opt/app-root/src

COPY package* ./

RUN npm ci

COPY . .

CMD ["npm", "start"]
