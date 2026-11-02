# ECR mirror of the official Node image (Docker Hub rate-limits Railway's builders)
FROM public.ecr.aws/docker/library/node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
# Not /app: the project has its own app/app route folder, which confuses the build at that path
WORKDIR /srv
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
ENV DATABASE_URL=file:/tmp/build.db
RUN npx prisma generate && npm run build
ENV NODE_ENV=production
CMD ["sh", "scripts/start.sh"]
