ARG NODE_VERSION=24

################################################################################
# Byg appen. Dockerfile bruger bevidst ikke RUN --mount, så den også virker
# med den klassiske Docker-builder i bl.a. ældre UGOS Pro-installationer.
FROM node:${NODE_VERSION}-alpine AS build

WORKDIR /usr/src/app
ENV TZ=Europe/Copenhagen

# better-sqlite3 skal på nogle ARM64/Alpine-systemer kompileres lokalt.
RUN apk add --no-cache python3 make g++

# Package-filer kopieres først, så Docker kan genbruge dependency-laget.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# Behold kun runtime-afhængigheder i det materiale, der kopieres til final.
RUN npm prune --omit=dev

################################################################################
# Lille runtime-stage uden compiler-værktøjerne.
FROM node:${NODE_VERSION}-alpine AS final

WORKDIR /usr/src/app
ENV NODE_ENV=production \
  TZ=Europe/Copenhagen

# su-exec lader entrypointet rette mount-rettigheder som root og derefter køre
# migration og server som den begrænsede node-bruger.
RUN apk add --no-cache su-exec

# Appen kører som den begrænsede node-bruger. Ejerskab ved kopiering er
# nødvendigt på NAS/Docker-installationer, hvor root-ejede buildfiler ellers
# kan give EACCES ved læsning af package.json.
COPY --from=build --chown=node:node /usr/src/app /usr/src/app
# NAS-filhåndteringen kan bevare restriktive rettigheder fra uploadmappen.
# Gør kode læsbar og mapper gennemløbelige for runtime-brugeren.
RUN chown -R node:node /usr/src/app \
  && chmod -R u+rwX,go+rX /usr/src/app
COPY docker-entrypoint.sh /usr/local/bin/hmrdtm-entrypoint
RUN chmod 755 /usr/local/bin/hmrdtm-entrypoint

EXPOSE 3000

ENTRYPOINT ["hmrdtm-entrypoint"]
CMD ["npm", "start"]
