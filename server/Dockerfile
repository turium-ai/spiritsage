FROM --platform=linux/amd64 node:20-slim
WORKDIR /usr/src/app

# Install Python and dependencies for inventory refresh
RUN apt-get update && apt-get install -y python3 python3-pip && \
    pip3 install odfpy --break-system-packages && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --omit=dev
COPY . .

# Cloud Run injects the PORT environment variable
ENV PORT=8080
EXPOSE 8080
CMD [ "npm", "start" ]
