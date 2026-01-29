FROM node:20-alpine
# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./
RUN npm ci --only=production

# Install dev dependencies for building
RUN npm install --include=dev

# Bundle app source
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

# Run the app using the compiled JavaScript
CMD [ "npm", "start" ]