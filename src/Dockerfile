# Start from a Node.js base image
FROM node:latest

# Install system dependencies for terminal recording and video conversion
RUN apt-get update && apt-get install -y \
    asciinema \
    python3-pip \
    ffmpeg

# Install asciicast2gif for converting terminal recordings to GIFs
RUN npm install --global asciicast2gif gifsicle


COPY ./asciinema-rec_script /usr/local/bin/asciinema-rec_script

RUN mkdir /app

# Create and define the working directory
WORKDIR /app

CMD [ "bash" ]
# Expose the port your app runs on
EXPOSE 3000