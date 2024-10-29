FROM node:20

WORKDIR /prueba-tecnica

COPY . .

RUN npm install

CMD ["npm", "start"]