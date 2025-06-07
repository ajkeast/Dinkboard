# Build the client
FROM node:18-alpine as client-builder
WORKDIR /app/client
COPY ../client/package*.json ./
RUN npm install
COPY ../client/ ./
RUN npm run build

# Build the server
FROM node:18-alpine as server-builder
WORKDIR /app/server
COPY package*.json ./
RUN npm install
COPY . .

# Final stage
FROM nginx:alpine
WORKDIR /app

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built client files
COPY --from=client-builder /app/client/build /usr/share/nginx/html

# Copy server files
COPY --from=server-builder /app/server /app/server

# Install Node.js in the final image
RUN apk add --update nodejs npm

# Set up the server
WORKDIR /app/server
RUN npm install --production

# Expose port 80
EXPOSE 80

# Start both nginx and the Node.js server
COPY start.sh /start.sh
RUN chmod +x /start.sh
CMD ["/start.sh"] 