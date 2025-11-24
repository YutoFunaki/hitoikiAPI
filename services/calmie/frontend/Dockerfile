# Node.jsベースイメージを使用
FROM node:18-alpine as build

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install

# アプリケーションコードをコピー
COPY . .

# Docker環境用の環境変数をコピー
COPY .env.docker .env

# アプリケーションをビルド
RUN npm run build

# 静的ファイルを配信するためにnginxを使用
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# nginx設定ファイルをコピー（SPAルーティング対応）
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
    # gzip圧縮を有効化 \
    gzip on; \
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript; \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]