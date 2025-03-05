FROM node:16-alpine

# Buat direktori aplikasi
WORKDIR /usr/src/app

# Salin package.json dan package-lock.json
COPY package*.json ./

# Install dependensi
RUN npm install

# Salin seluruh kode aplikasi
COPY . .

# Buat direktori downloads
RUN mkdir -p downloads

# Expose port yang digunakan aplikasi
EXPOSE 3000

# Jalankan aplikasi
CMD ["npm", "start"]