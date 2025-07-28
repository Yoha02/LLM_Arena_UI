# Stage 1: Build the Next.js application
FROM node:18-alpine AS build

# Set the working directory
WORKDIR /app

# Accept the API key as a build argument
ARG OPENROUTER_API_KEY

# Make the API key available to the build process
ENV OPENROUTER_API_KEY=$OPENROUTER_API_KEY

# Copy package.json and the lock file for deterministic installs
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies needed for the build)
# 'npm ci' is faster and safer for CI/CD than 'npm install'
RUN npm ci

# Copy the rest of the application source code
COPY . .

# Run the build script
RUN npm run build

# Stage 2: Production image - lightweight and contains only what's needed to run
FROM node:18-alpine
WORKDIR /app

# Accept the API key as a build argument (needed for production stage)
ARG OPENROUTER_API_KEY

# Forward the environment variable to the final running container
ENV OPENROUTER_API_KEY=$OPENROUTER_API_KEY

# Copy only the production dependencies from the 'build' stage's node_modules
# This prevents devDependencies from being in the final image
COPY --from=build /app/package.json ./package.json
RUN npm ci --only=production

# Copy the built application from the 'build' stage
# This includes the .next directory (the build output) and the public directory
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public

# Expose the port the app runs on. Cloud Run will automatically use this.
EXPOSE 3000

# The command to start the Next.js production server
# Next.js will automatically listen on the PORT environment variable provided by Cloud Run
CMD ["npm", "start"] 