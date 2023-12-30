#FROM node:latest
FROM node:21.5.0-bookworm

RUN apt-get update && apt-get install -y \
    asciinema \
    python3-pip \
    ffmpeg \
    libnss3 libxss1 libasound2 libatk-bridge2.0-0 libgtk-3-0 docker.io sudo 

RUN npm install --global puppeteer puppeteer-screen-recorder

RUN groupadd runuser && \
    useradd -g runuser runuser && mkhomedir_helper runuser
RUN usermod -aG docker runuser

RUN echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> \
/etc/sudoers

RUN npm install -g npm@10.2.5
USER runuser
WORKDIR /tmp/autobashcraft/workspace

COPY --chown=runuser:runuser scripts/* /scripts/
RUN cd /scripts/ && PUPPETEER_SKIP_DOWNLOAD=true npm i
COPY ./scripts/asciinema-rec_script /usr/local/bin/asciinema-rec_script

CMD [ "bash" ]