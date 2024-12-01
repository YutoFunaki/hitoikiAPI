# Pythonベースイメージを使用
FROM python:3.11-slim

# 作業ディレクトリを設定
WORKDIR /app

# Pythonモジュールパスを設定
ENV PYTHONPATH=/app/app

# 必要なファイルをコピー
COPY ./app /app/app
COPY ./app/firebase/hitoiki-app-firebase-adminsdk-xn0xn-bf68272980.json /app/app/firebase/


# 依存関係をインストール
RUN pip install --no-cache-dir -r /app/app/requirements.txt

# アプリケーションを起動
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
