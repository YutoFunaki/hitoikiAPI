# Pythonベースイメージを使用
FROM python:3.11-slim

# 作業ディレクトリを設定
WORKDIR /app
ENV PYTHONPATH=/app

# 必要なファイルをコピー
COPY ./app /app/app

# 依存関係をインストール
RUN pip install --no-cache-dir -r /app/app/requirements.txt

# アプリケーションを起動
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
