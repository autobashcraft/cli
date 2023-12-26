# Start from a Node.js base image
FROM node:latest

# Install system dependencies for terminal recording and video conversion
RUN apt-get update && apt-get install -y \
    asciinema \
    python3-pip \
    ffmpeg \
    libnss3 libxss1 libasound2 libatk-bridge2.0-0 libgtk-3-0

RUN npm install --global puppeteer puppeteer-screen-recorder

# Install asciicast2gif for converting terminal recordings to GIFs
RUN groupadd runuser && \
    useradd -g runuser runuser && mkhomedir_helper runuser
USER runuser
# Create and define the working directory
WORKDIR /app

COPY --chown=runuser:runuser scripts/* /scripts/
RUN cd /scripts/ && npm i
COPY ./asciinema-rec_script /usr/local/bin/asciinema-rec_script



CMD [ "bash" ]
# Expose the port your app runs on
EXPOSE 3000