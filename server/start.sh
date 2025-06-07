#!/bin/sh

# Start the Node.js server in the background
cd /app/server && npm start &

# Start Nginx in the foreground
nginx -g 'daemon off;' 