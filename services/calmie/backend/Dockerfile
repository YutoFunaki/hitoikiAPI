# Pythonベースイメージを使用
FROM python:3.11-slim

# システムパッケージの更新とffmpegのインストール
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 作業ディレクトリを設定
WORKDIR /app

# Pythonモジュールパスを設定
ENV PYTHONPATH=/app/app

# 必要なファイルをコピー
COPY ./app /app/app

# Firebase認証ディレクトリを作成
RUN mkdir -p /app/app/firebase

# アップロード、静的ファイル、メディア用のディレクトリを作成
RUN mkdir -p /app/uploads /app/static /app/media

# 依存関係をインストール
RUN pip install --no-cache-dir -r /app/app/requirements.txt

# ポート8000を公開
EXPOSE 8000

# アプリケーションを起動
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
