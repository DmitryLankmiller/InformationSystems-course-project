package ru.ifmo.se.clientspeak.controller;

import java.util.Map;

import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ru.ifmo.se.clientspeak.model.enums.StatusEnum;
import ru.ifmo.se.clientspeak.repository.FeedbackObjectRepository;
import ru.ifmo.se.clientspeak.repository.ParsingJobRepository;
import ru.ifmo.se.clientspeak.service.KafkaPublisher;

@Component
@Slf4j
@RequiredArgsConstructor
public class ParsingDoneKafkaListener {
    private final ObjectMapper objectMapper;
    private final ParsingJobRepository parsingJobRepository;
    private final FeedbackObjectRepository feedbackObjectRepository;
    private final KafkaPublisher kafkaPublisher;

    private static final String BUILD_REPORT_TOPIC = "build-report";

    @KafkaListener(topics = "parsing-done", groupId = "backend-group")
    @org.springframework.transaction.annotation.Transactional
    public void onParsingDone(String message) {
        try {
            JsonNode root = objectMapper.readTree(message);
            Long jobId = root.path("jobId").isNumber() ? root.get("jobId").asLong() : null;
            Integer expected = root.has("totalFeedbacks") && root.get("totalFeedbacks").canConvertToInt()
                    ? root.get("totalFeedbacks").asInt()
                    : null;

            if (jobId == null) {
                log.warn("parsing-done without jobId: {}", message);
                return;
            }

            var job = parsingJobRepository.findById(jobId)
                    .orElseThrow(() -> new IllegalArgumentException("job not found: " + jobId));

            if (job.getStatus() != StatusEnum.in_progress) {
                log.warn("Job {} expected IN_PROGRESS, but {}", jobId, job.getStatus());
            }

            waitUntilFeedbacksPersist(jobId, expected, 120_000, 8_000, 800);

            job.setStatus(StatusEnum.parsing_done);
            parsingJobRepository.save(job);
            log.info("Job {} status -> parsing_done", jobId);

            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    Map<String, Object> payload = Map.of("jobId", jobId);
                    kafkaPublisher.publishTo(BUILD_REPORT_TOPIC, payload);
                    log.info("Published build-report for job {}", jobId);
                }
            });

        } catch (Exception e) {
            log.error("Error in parsing-done listener: {}", e.getMessage(), e);
        }
    }

    private void waitUntilFeedbacksPersist(Long jobId,
            Integer expected,
            long timeoutMillis,
            long quietMillis,
            long pollEveryMillis) throws InterruptedException {
        final long start = System.currentTimeMillis();
        long lastCount = feedbackObjectRepository.countByParsingJobId(jobId);
        long lastChangeTs = System.currentTimeMillis();

        log.info("Waiting feedbacks persist for job {} (expected={}, startCount={})",
                jobId, expected, lastCount);

        while (true) {
            if (System.currentTimeMillis() - start > timeoutMillis) {
                log.warn("Timeout while waiting feedbacks for job {} (lastCount={}, expected={})",
                        jobId, lastCount, expected);
                return;
            }

            Thread.sleep(pollEveryMillis);

            long curr = feedbackObjectRepository.countByParsingJobId(jobId);
            if (curr != lastCount) {
                lastCount = curr;
                lastChangeTs = System.currentTimeMillis();
                log.debug("Job {} feedbacks count changed: {}", jobId, curr);
            }

            boolean expectedReached = expected != null && expected > 0 && lastCount >= expected;
            boolean quietWindow = (System.currentTimeMillis() - lastChangeTs) >= quietMillis;

            if ((expectedReached) || quietWindow) {
                log.info("Proceed for job {}: count={}, expected={}, quietWindowReached={}",
                        jobId, lastCount, expected, quietWindow);
                return;
            }
        }
    }
}
