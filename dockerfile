# Use a Node.js base image
FROM node:20

# Set the working directory in the container
WORKDIR /root/deploy/datn/ServiceAuth

# Copy package.json and package-lock.json
COPY . .



# Install dependencies
RUN yarn install

# Gen proto
RUN yarn gen:proto_folder
RUN yarn gen:proto

# Creates a "dist" folder with the production build
RUN yarn build

# Expose the port your app runs on
EXPOSE 3001

# Command to run your application
CMD ["yarn", "start"]
