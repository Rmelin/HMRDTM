# Docker

Den komplette og vedligeholdte vejledning findes i [README.md](./README.md) og
den visuelle [deployment-guide](./deployment-guide.html). Produktion bruger
`compose.production.yml` og en privat `.env` oprettet fra `.env.example`.

### Lokal Docker-kørsel

When you're ready, start your application by running:
`docker compose up --build`.

Your application will be available at http://localhost:3000.

### Deploying your application to the cloud

Brug projektets production Compose-flow frem for at bygge og pushe et manuelt
image:

```bash
cp .env.example .env
chmod 600 .env
# Indsæt CLOUDFLARE_TUNNEL_TOKEN i .env
docker compose --env-file .env -f compose.production.yml config --quiet
docker compose --env-file .env -f compose.production.yml up -d --build
```

De generiske kommandoer nedenfor er kun relevante, hvis du selv driver et
container-registry.

First, build your image, e.g.: `docker build -t myapp .`.
If your cloud uses a different CPU architecture than your development
machine (e.g., you are on a Mac M1 and your cloud provider is amd64),
you'll want to build the image for that platform, e.g.:
`docker build --platform=linux/amd64 -t myapp .`.

Then, push it to your registry, e.g. `docker push myregistry.com/myapp`.

Consult Docker's [getting started](https://docs.docker.com/go/get-started-sharing/)
docs for more detail on building and pushing.

### References
* [Docker's Node.js guide](https://docs.docker.com/language/nodejs/)
