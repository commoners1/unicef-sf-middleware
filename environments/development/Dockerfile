# Development Dockerfile
FROM node:latest

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci

# Copy source code and schema
COPY src/ ./src/
COPY libs/ ./libs/
COPY prisma/ ./prisma/

# Generate Prisma client with updated schema
RUN npx prisma generate

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
# CMD ["npm", "run", "start:dev"]
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:dev"]
# CMD ["sh", "-c", "npx prisma migrate dev --name init && npx prisma migrate deploy && npm run start:dev"]
# CMD ["sh", "-c", "npx prisma db push && npx prisma migrate deploy && npm run start:dev"]
# CMD ["sh", "-c", "npx prisma db push && npm run start:dev"]
