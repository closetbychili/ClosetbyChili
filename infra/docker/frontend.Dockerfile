# ================================================
# Closet by Chilli — Frontend Development Dockerfile
# ================================================

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY apps/frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy frontend source
COPY apps/frontend/ ./

# Expose port
EXPOSE 3000

# Default command
CMD ["npm", "run", "dev"]
