FROM registry.access.redhat.com/ubi8/nodejs-16-minimal

WORKDIR /opt/app-root/src

COPY package* ./

RUN npm ci

COPY . .

CMD npm start
