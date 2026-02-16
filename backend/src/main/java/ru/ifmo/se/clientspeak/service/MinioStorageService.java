package ru.ifmo.se.clientspeak.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import io.minio.BucketExistsArgs;
import io.minio.GetObjectArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import jakarta.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MinioStorageService {
    private final MinioClient minioClient;

    @Value("${app.s3.bucket:feedbacks}")
    private String defaultBucket;

    @PostConstruct
    public void ensureBucket() {
        ensureBucketExists(defaultBucket);
    }

    public void ensureBucketExists(String bucket) {
        try {
            boolean found = minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!found) {
                minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public String uploadBytes(String bucket, String objectName, byte[] bytes, String contentType) throws Exception {
        ensureBucketExists(bucket);
        try (InputStream is = new ByteArrayInputStream(bytes)) {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .stream(is, bytes.length, -1)
                    .contentType(contentType)
                    .build());
            return objectName;
        }
    }

    public byte[] downloadBytes(String bucket, String objectName) {
        try (InputStream is = minioClient.getObject(
                GetObjectArgs.builder()
                        .bucket(bucket)
                        .object(objectName)
                        .build())) {
            return is.readAllBytes();
        } catch (Exception e) {
            throw new RuntimeException("Failed to download from minio: " + bucket + "/" + objectName, e);
        }
    }

    public void deleteObjects(String bucket, List<String> keys) {
        if (keys == null || keys.isEmpty())
            return;
        for (String k : keys) {
            try {
                minioClient.removeObject(
                        RemoveObjectArgs.builder().bucket(bucket).object(k).build());
            } catch (Exception e) {
            }
        }
    }

    public void deleteFeedbackObjects(List<String> keys) {
        deleteObjects(defaultBucket, keys);
    }

}
