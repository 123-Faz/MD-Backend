# # Use the latest Node Alpine image
# FROM node:alpine as dev

# # Set working directory
# WORKDIR /app

# # Copy backend files
# COPY Backend/package.json ./

# # Install dependencies
# RUN npm install

# COPY Backend/ .
# # Expose backend port
# EXPOSE 8000

# # Run backend server
# CMD ["npm", "run", "dev"]

# # Use the latest Node Alpine image
# FROM node:alpine as prod

# # Set working directory
# WORKDIR /app

# # Copy backend files
# COPY Backend/package.json ./

# # Install dependencies
# RUN npm install

# COPY Backend/ .
# # Expose backend port
# EXPOSE 8000

# # Run backend server
# CMD ["npm", "run", "dev"]

# Development stage
FROM node:alpine as dev

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 8000

# Run in development mode
CMD ["npm", "run", "dev"]

# Production stage
FROM node:alpine as prod

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies (production only)
RUN npm ci --only=production

# Copy source code and built files
COPY . .
COPY --from=dev /app/dist ./dist

EXPOSE 8000

# Start the server
CMD ["node", "dist/server.js"]