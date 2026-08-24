FROM node:22-alpine
WORKDIR /app
COPY gateway.mjs ./gateway.mjs
ENV NODE_ENV=production
EXPOSE 8787
CMD ["node", "gateway.mjs"]
