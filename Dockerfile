# 阶段 1：构建 Vite 静态产物
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build && test -d dist

# 阶段 2：nginx 托管静态文件 + SPA fallback
FROM nginx:1.27-alpine
LABEL org.opencontainers.image.source="https://github.com/qqww45/LabelPrinter"
LABEL org.opencontainers.image.description="Label Printer - static site"

# 移除默认配置
RUN rm /etc/nginx/conf.d/default.conf

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
