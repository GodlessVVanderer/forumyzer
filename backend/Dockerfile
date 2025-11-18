FROM node:18-alpine

WORKDIR /app

# Copy package files (including lock file)
COPY package*.json ./

# Install dependencies from lock file
RUN npm ci --only=production

# Copy application code
COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
