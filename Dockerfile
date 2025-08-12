# Etapa 1: Imagem base
FROM node:18-alpine AS base

# Instalar dependências globais
RUN apk add --no-cache bash

# Defina o diretório de trabalho no container
WORKDIR /app

# Etapa 2: Dependências
FROM base AS dependencies

# Copie o package.json e o package-lock.json para instalar as dependências
COPY package.json package-lock.json ./

# Instalar as dependências do projeto
RUN npm install --frozen-lockfile

# Etapa 3: Build
FROM dependencies AS build

# Copiar todo o código do projeto para o container
COPY . .

# Executar a construção do Next.js
RUN npm run build

# Etapa 4: Imagem de produção
FROM base AS production

# Copiar os arquivos necessários da etapa de build
COPY --from=build /app /app

# Expor a porta que o Next.js vai rodar
EXPOSE 3001

# Definir variável de ambiente para Next.js em modo produção
ENV NODE_ENV=production

# Rodar o Next.js em produção
CMD ["npm", "start"]

