# Use the official Node.js 18 image
FROM node:18-alpine AS base

# Install pnpm globally
RUN npm install -g pnpm

# Build stage
FROM base AS build
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM base AS production
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built application from build stage
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

# Expose port
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"] 