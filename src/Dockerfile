FROM node:latest

RUN apt-get update && apt-get install -y \
    asciinema \
    python3-pip \
    ffmpeg \
    libnss3 libxss1 libasound2 libatk-bridge2.0-0 libgtk-3-0 docker.io

RUN npm install --global puppeteer puppeteer-screen-recorder

RUN groupadd runuser && \
    useradd -g runuser runuser && mkhomedir_helper runuser
RUN usermod -aG docker runuser
USER runuser
WORKDIR /app

COPY --chown=runuser:runuser scripts/* /scripts/
RUN cd /scripts/ && npm i
COPY ./asciinema-rec_script /usr/local/bin/asciinema-rec_script


CMD [ "bash" ]