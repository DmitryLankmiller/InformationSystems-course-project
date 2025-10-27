import io
import os
import random
import string
from datetime import datetime
from minio import Minio
from minio.error import S3Error
from dotenv import load_dotenv

load_dotenv()

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
BUCKET_NAME = os.getenv("BUCKET_NAME")

FILES_COUNT = 50
MAX_SIZE_BYTES = 512 * 1024
CONTENT_TYPES = ["application/json", "text/plain", "application/octet-stream"]


def random_filename():
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    rand = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
    return f"file_{ts}_{rand}.dat"


def random_bytes(size):
    return os.urandom(size)


def random_json():
    import json

    data = {
        "id": random.randint(1, 1_000_000),
        "name": "".join(random.choices(string.ascii_letters, k=10)),
        "value": random.random(),
        "timestamp": datetime.now().isoformat(),
    }
    return json.dumps(data).encode("utf-8")


def main():
    client = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=False,
    )

    if not client.bucket_exists(BUCKET_NAME):
        client.make_bucket(BUCKET_NAME)
        print(f"Bucket '{BUCKET_NAME}' создан.")
    else:
        print(f"Bucket '{BUCKET_NAME}' существует.")

    for i in range(FILES_COUNT):
        content_type = random.choice(CONTENT_TYPES)
        filename = random_filename()

        if content_type == "application/json":
            data = random_json()
        elif content_type == "text/plain":
            text = "".join(
                random.choices(
                    string.ascii_letters + string.digits + " ",
                    k=random.randint(50, 200),
                )
            )
            data = text.encode("utf-8")
        else:
            data = random_bytes(random.randint(1024, MAX_SIZE_BYTES))

        try:
            client.put_object(
                bucket_name=BUCKET_NAME,
                object_name=filename,
                data=io.BytesIO(data),
                length=len(data),
                content_type=content_type,
            )
            print(
                f"[{i+1}/{FILES_COUNT}] Uploaded: {filename} ({len(data)} bytes, {content_type})"
            )
        except S3Error as e:
            print(f"Ошибка при загрузке {filename}: {e}")

    print(f"\nГотово! Залито {FILES_COUNT} файлов в бакет '{BUCKET_NAME}'.")


if __name__ == "__main__":
    main()
