package ru.ifmo.se.clientspeak.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ru.ifmo.se.clientspeak.model.FeedbackObject;
import ru.ifmo.se.clientspeak.model.ParsingJob;
import ru.ifmo.se.clientspeak.model.ParsingLink;
import ru.ifmo.se.clientspeak.model.SearchByText;
import ru.ifmo.se.clientspeak.model.enums.FeedbackStateEnum;
import ru.ifmo.se.clientspeak.model.enums.StatusEnum;
import ru.ifmo.se.clientspeak.repository.FeedbackObjectRepository;
import ru.ifmo.se.clientspeak.repository.ParsingJobRepository;
import ru.ifmo.se.clientspeak.repository.ParsingLinkRepository;
import ru.ifmo.se.clientspeak.repository.SearchByTextRepository;
import ru.ifmo.se.clientspeak.service.KafkaPublisher;
import ru.ifmo.se.clientspeak.service.MinioStorageService;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@Slf4j
@RequiredArgsConstructor
public class FeedbackKafkaListener {
    private final ObjectMapper objectMapper;
    private final MinioStorageService minioStorageService;
    private final FeedbackObjectRepository feedbackObjectRepository;
    private final ParsingJobRepository parsingJobRepository;

    private final ParsingLinkRepository parsingLinkRepository;
    private final SearchByTextRepository searchByTextRepository;
    private final KafkaPublisher kafkaPublisher;

    private static final String FEEDBACKS_BUCKET = "feedbacks";

    @KafkaListener(topics = "parsing-feedbacks", groupId = "backend-group")
    public void listen(String message) {
        try {
            processFeedbackMessage(message);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Transactional
    public void processFeedbackMessage(String message) throws Exception {
        JsonNode root = objectMapper.readTree(message);
        Long jobId = root.has("jobId") ? root.get("jobId").asLong() : null;
        JsonNode feedbackNode = root.has("feedback") ? root.get("feedback") : root;

        byte[] payloadBytes = objectMapper.writeValueAsBytes(feedbackNode);
        String checksum = DigestUtils.sha256Hex(payloadBytes);
        String objectName = String.format("job-%s/%s.json", jobId != null ? jobId : "unknown", UUID.randomUUID());

        minioStorageService.uploadBytes(FEEDBACKS_BUCKET, objectName, payloadBytes, "application/json");

        short stars = 1;
        if (feedbackNode.has("feedback_rating") && feedbackNode.get("feedback_rating").canConvertToInt()) {
            int v = feedbackNode.get("feedback_rating").asInt();
            if (v >= 1 && v <= 5)
                stars = (short) v;
        }

        FeedbackStateEnum state = FeedbackStateEnum.purchased;
        if (feedbackNode.has("feedback_state")) {
            try {
                state = FeedbackStateEnum.valueOf(feedbackNode.get("feedback_state").asText());
            } catch (Exception ignored) {
            }
        }

        LocalDateTime date = LocalDateTime.now();
        if (feedbackNode.has("feedback_date")) {
            try {
                date = LocalDateTime.parse(feedbackNode.get("feedback_date").asText());
            } catch (Exception ignored) {
            }
        }

        FeedbackObject fo = FeedbackObject.builder()
                .s3Key(objectName)
                .checksum(checksum)
                .starsRating(stars)
                .feedbackState(state)
                .feedbackDate(date)
                .build();

        if (jobId != null) {
            var job = parsingJobRepository.findById(jobId).orElse(null);
            if (job != null)
                fo.setParsingJob(job);
        }
        feedbackObjectRepository.save(fo);
    }

    @KafkaListener(topics = "parsing-links-collected", groupId = "backend-group")
    public void listenLinks(String message) {
        try {
            processLinksMessage(message);
        } catch (Exception e) {
            log.error("Error processing links-collected message: {}", e.getMessage(), e);
        }
    }

    @Transactional
    public void processLinksMessage(String message) throws Exception {
        JsonNode root = objectMapper.readTree(message);
        Long jobId = root.has("jobId") ? root.get("jobId").asLong() : null;
        if (jobId == null) {
            log.warn("links message without jobId: {}", message);
            return;
        }

        List<String> links = new ArrayList<>();
        if (root.has("links") && root.get("links").isArray()) {
            for (JsonNode n : root.get("links")) {
                if (n.isTextual())
                    links.add(n.asText());
            }
        }

        log.info("Received {} links for job {}", links.size(), jobId);

        var jobOpt = parsingJobRepository.findById(jobId);
        if (jobOpt.isEmpty()) {
            log.warn("ParsingJob id={} not found, skipping links", jobId);
            return;
        }
        ParsingJob job = jobOpt.get();

        List<ParsingLink> toSave = new ArrayList<>();
        for (String url : links) {
            boolean exists = parsingLinkRepository.existsByParsingJobIdAndUrl(jobId, url);
            if (!exists) {
                var pl = ParsingLink.builder()
                        .parsingJob(job)
                        .url(url)
                        .isParsed(false)
                        .lastUpdated(LocalDateTime.now())
                        .build();
                toSave.add(pl);
            }
        }
        if (!toSave.isEmpty()) {
            parsingLinkRepository.saveAll(toSave);
            log.info("Saved {} new parsing_links for job {}", toSave.size(), jobId);
        } else {
            log.info("No new links to save for job {}", jobId);
        }

        var sList = searchByTextRepository.findByParsingJobId(jobId);
        if (!sList.isEmpty()) {
            SearchByText s = sList.get(0);
            if (!s.isLinksCollected()) {
                s.setLinksCollected(true);
                searchByTextRepository.save(s);
                log.info("Set links_collected=true for search_by_text id={} job={}", s.getId(), jobId);
            }
        }

        if (job.getStatus() != null && job.getStatus().name().equals("collecting_links")) {
            job.setStatus(StatusEnum.links_collected);
            parsingJobRepository.save(job);
            log.info("Job {} status -> links_collected", jobId);
        }

        job.setStatus(StatusEnum.in_progress);
        parsingJobRepository.save(job);
        log.info("Job {} status -> in_progress", jobId);

        List<String> linksForParsing = parsingLinkRepository.findByParsingJobId(jobId)
                .stream().map(ParsingLink::getUrl).collect(Collectors.toList());

        Integer feedbacksPerItemLimit = job.getFeedbacksPerItemLimit();
        String feedbacksSortType = (job.getFeedbacksSortType() != null)
                ? job.getFeedbacksSortType().name()
                : null;

        Map<String, Object> payload = new HashMap<>();
        payload.put("jobId", jobId);
        payload.put("type", "parse_links");
        payload.put("links", linksForParsing);

        if (feedbacksPerItemLimit != null) {
            payload.put("feedbacksPerItemLimit", feedbacksPerItemLimit);
        }
        if (feedbacksSortType != null) {
            payload.put("feedbacksSortType", feedbacksSortType);
        }

        kafkaPublisher.publishJob(payload);
        log.info("Published parse_links task for job {} with {} links (perItemLimit={}, sort={})",
                jobId, linksForParsing.size(), feedbacksPerItemLimit, feedbacksSortType);

    }
}
