# Use official Node.js runtime as base image
FROM node:24-alpine

# Set working directory in container
WORKDIR /app

# Copy package.json and package-lock.json from Backend folder
COPY Backend/package*.json ./

# Install dependencies
RUN npm install --production

# Copy backend application files
COPY Backend/ .

# Expose port (Back4App will assign the actual port)
EXPOSE 5000

# Set environment variables
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["npm", "start"]
