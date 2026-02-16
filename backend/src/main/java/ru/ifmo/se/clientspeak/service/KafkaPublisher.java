package ru.ifmo.se.clientspeak.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class KafkaPublisher {
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private static final String JOBS_TOPIC = "parsing-jobs";

    public void publishJob(Object payload) {
        publishTo(JOBS_TOPIC, payload);
    }

    public void publishTo(String topic, Object payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            kafkaTemplate.send(topic, json);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }
}
