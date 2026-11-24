FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV COREPACK_HOME=/opt/corepack
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV PATH="${PATH}:${ANDROID_HOME}/cmdline-tools/latest/bin:${ANDROID_HOME}/platform-tools"

RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jdk-headless \
    git \
    curl \
    unzip \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p ${COREPACK_HOME} \
    && corepack enable \
    && corepack prepare pnpm@10 --activate

RUN mkdir -p ${ANDROID_HOME}/cmdline-tools \
    && curl -fsSL https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -o /tmp/cmdline-tools.zip \
    && unzip -q /tmp/cmdline-tools.zip -d ${ANDROID_HOME}/cmdline-tools \
    && mv ${ANDROID_HOME}/cmdline-tools/cmdline-tools ${ANDROID_HOME}/cmdline-tools/latest \
    && rm /tmp/cmdline-tools.zip

RUN (yes || true) | sdkmanager --licenses > /dev/null 2>&1 \
    && sdkmanager \
       "platform-tools" \
       "platforms;android-35" \
       "build-tools;35.0.0"

RUN mkdir -p /workspace /home/node/.gradle /home/node/.local/share/pnpm/store \
    && chown -R node:node ${ANDROID_HOME} ${COREPACK_HOME} /workspace /home/node/.gradle /home/node/.local

USER node
WORKDIR /workspace

EXPOSE 8081

CMD ["tail", "-f", "/dev/null"]