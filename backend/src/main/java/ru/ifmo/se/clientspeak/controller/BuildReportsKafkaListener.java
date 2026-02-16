package ru.ifmo.se.clientspeak.controller;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ru.ifmo.se.clientspeak.service.ReportService;

@Component
@Slf4j
@RequiredArgsConstructor
public class BuildReportsKafkaListener {
    private final ObjectMapper objectMapper;
    private final ReportService reportService;

    @KafkaListener(topics = "build-report", groupId = "backend-group")
    public void onBuildReport(String message) {
        try {
            JsonNode root = objectMapper.readTree(message);
            Long jobId = root.has("jobId") ? root.get("jobId").asLong() : null;
            if (jobId == null) {
                log.warn("build-report without jobId: {}", message);
                return;
            }
            reportService.buildReportsForJob(jobId);
            log.info("Reports built for job {}", jobId);
        } catch (Exception e) {
            log.error("Error in build-report listener: {}", e.getMessage(), e);
        }
    }
}
