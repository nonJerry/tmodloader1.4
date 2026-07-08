FROM steamcmd/steamcmd:debian-bookworm AS builder
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl tar && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /root/installer
RUN curl -sqL https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz | tar zxvf -
RUN set -eux; \
    for d in /usr/bin /etc/ssl/certs /lib /usr/lib; do \
    if [ -e "$d" ]; then \
    chown -R root:root "$d"; \
    fi; \
    done


FROM debian:bookworm-slim AS build
# The TMOD Version. Ensure that you follow the correct format. Version releases can be found at https://github.com/tModLoader/tModLoader/releases if you're lost.
ARG TMOD_VERSION=v2026.05.3.0

RUN apt-get update && \
    apt-get install -y curl unzip && \
    mkdir /data && \
    mkdir /data/tModLoader && \
    mkdir /data/tModLoader/Worlds && \
    mkdir /data/tModLoader/Mods && \
    mkdir /data/steamMods && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /terraria-server

RUN curl -L -o tModLoader.zip "https://github.com/tModLoader/tModLoader/releases/download/${TMOD_VERSION}/tModLoader.zip" && \
    unzip -o tModLoader.zip && \
    rm tModLoader.zip


FROM debian:bookworm-slim AS server
ENV UPDATE_NOTICE="true"
ENV TMOD_SHUTDOWN_MESSAGE="Server is shutting down NOW!"
ENV TMOD_AUTOSAVE_INTERVAL="10"
ENV TMOD_AUTODOWNLOAD=""
ENV TMOD_ENABLEDMODS=""
ENV TMOD_USECONFIGFILE="No"

ENV TMOD_MOTD="A tModLoader server powered by Podman!"
ENV TMOD_PASS="docker"
ENV TMOD_MAXPLAYERS="8"
ENV TMOD_WORLDNAME="Docker"
ENV TMOD_WORLDSIZE="3"
ENV TMOD_WORLDSEED="Docker"
ENV TMOD_DIFFICULTY="1"
ENV TMOD_SECURE="1"
ENV TMOD_LANGUAGE="en-US"
ENV TMOD_NPCSTREAM="60"
ENV TMOD_UPNP="0"
ENV TMOD_PRIORITY="1"
ENV TMOD_PORT="7777"

ENV TMOD_JOURNEY_SETFROZEN="0"
ENV TMOD_JOURNEY_SETDAWN="0"
ENV TMOD_JOURNEY_SETNOON="0"
ENV TMOD_JOURNEY_SETDUSK="0"
ENV TMOD_JOURNEY_SETMIDNIGHT="0"
ENV TMOD_JOURNEY_GODMODE="0"
ENV TMOD_JOURNEY_WIND_STRENGTH="0"
ENV TMOD_JOURNEY_RAIN_STRENGTH="0"
ENV TMOD_JOURNEY_TIME_SPEED="0"
ENV TMOD_JOURNEY_RAIN_FROZEN="0"
ENV TMOD_JOURNEY_WIND_FROZEN="0"
ENV TMOD_JOURNEY_PLACEMENT_RANGE="0"
ENV TMOD_JOURNEY_SET_DIFFICULTY="0"
ENV TMOD_JOURNEY_BIOME_SPREAD="0"
ENV TMOD_JOURNEY_SPAWN_RATE="0"

ENV LANG=en_US.UTF-8

# Copy steamcmd and its required libs from the builder
COPY --from=builder /root/installer/steamcmd.sh /usr/lib/games/steam/
COPY --from=builder /root/installer/linux32/steamcmd /usr/lib/games/steam/
COPY --from=builder /usr/games/steamcmd /usr/bin/steamcmd
COPY --from=builder /etc/ssl/certs /etc/ssl/certs
COPY --from=builder /lib/i386-linux-gnu /lib/
COPY --from=builder /root/installer/linux32/libstdc++.so.6 /lib/

WORKDIR /terraria-server
COPY --from=build /terraria-server /terraria-server
COPY DotNetInstall.sh ./LaunchUtils
COPY entrypoint.sh .
COPY inject.sh /usr/local/bin/inject
COPY autosave.sh .
COPY prepare-config.sh .

RUN apt-get update && apt-get install -y \
    curl tmux netcat-openbsd libsdl2-2.0-0 bash busybox locales procps && \
    locale-gen && \
    chmod +x ./LaunchUtils/DotNetInstall.sh && \
    chmod +x ./LaunchUtils/InstallDotNet.sh && \
    chmod +x ./LaunchUtils/ScriptCaller.sh && \
    chmod +x ./entrypoint.sh && \
    chmod +x ./autosave.sh && \
    chmod +x /usr/local/bin/inject && \
    chmod +x ./prepare-config.sh && \
    chmod +x ./start-tModLoaderServer.sh && \
    ./LaunchUtils/DotNetInstall.sh && \
    rm -rf /var/lib/apt/lists/*

COPY --from=build /data /data

EXPOSE 7777
ENTRYPOINT ["./entrypoint.sh"]
