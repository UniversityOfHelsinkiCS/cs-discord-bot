FROM registry.access.redhat.com/ubi9/nodejs-24-minimal

ENV TZ=Europe/Helsinki

WORKDIR /opt/app-root/src

COPY package* ./

RUN npm ci

COPY . .

CMD ["npm", "start"]
