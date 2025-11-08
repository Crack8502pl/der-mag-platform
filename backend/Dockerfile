FROM node:20-alpine

WORKDIR /app

# Instalacja zależności
COPY package*.json ./
RUN npm ci --only=production

# Kopiowanie kodu źródłowego
COPY . .

# Budowanie aplikacji
RUN npm run build

# Utworzenie katalogów dla uploadów
RUN mkdir -p uploads/photos uploads/thumbnails

# Eksponowanie portu
EXPOSE 3000

# Uruchomienie aplikacji
CMD ["node", "dist/index.js"]
