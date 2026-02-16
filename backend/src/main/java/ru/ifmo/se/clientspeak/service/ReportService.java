package ru.ifmo.se.clientspeak.service;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import ru.ifmo.se.clientspeak.model.FeedbackObject;
import ru.ifmo.se.clientspeak.model.ParsingJob;
import ru.ifmo.se.clientspeak.model.StatisticalReport;
import ru.ifmo.se.clientspeak.model.Top5Words;
import ru.ifmo.se.clientspeak.model.enums.StatusEnum;
import ru.ifmo.se.clientspeak.repository.FeedbackObjectRepository;
import ru.ifmo.se.clientspeak.repository.ParsingJobRepository;
import ru.ifmo.se.clientspeak.repository.StatisticalReportRepository;
import ru.ifmo.se.clientspeak.repository.Top5WordsRepository;

@Service
@RequiredArgsConstructor
public class ReportService {
    private final ParsingJobRepository parsingJobRepository;
    private final FeedbackObjectRepository feedbackObjectRepository;
    private final StatisticalReportRepository statisticalReportRepository;
    private final Top5WordsRepository top5WordsRepository;
    private final MinioStorageService minioStorageService;
    private final ObjectMapper objectMapper;

    private static final String FEEDBACKS_BUCKET = "feedbacks";
    private static final String ADVANTAGES_TEXT = "достоинства";
    private static final String DISADVANTAGES_TEXT = "недостатки";
    private static final String COMMENTS_TEXT = "комментарий";

    private static final Set<String> STOPWORDS = new HashSet<>(List.of(

            "и", "в", "во", "на", "но", "а", "я", "мы", "вы", "он", "она", "оно", "они",
            "с", "со", "к", "ко", "от", "до", "за", "из", "у", "по", "о", "об", "обо", "для",
            "это", "этот", "эта", "эти", "что", "как", "так", "же", "или", "не", "да", "нет",
            "бы", "ли", "то", "уж", "ну",

            "the", "a", "an", "and", "or", "but", "if", "then", "else", "to", "of", "in", "on",
            "for", "with", "is", "are", "was", "were", "be", "been", "being"));

    @Transactional
    public void buildReportsForJob(Long jobId) {
        ParsingJob job = parsingJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("job not found: " + jobId));

        if (job.getStatus() != StatusEnum.parsing_done) {
            throw new IllegalStateException("Job must be in PARSING_DONE to build reports");
        }

        job.setStatus(StatusEnum.creating_report);
        parsingJobRepository.save(job);

        try {

            Integer statReportId = statisticalReportRepository.createStatReport(jobId.intValue());
            if (statReportId == null) {
                throw new IllegalStateException("create_stat_report returned null");
            }

            Top5Words top = computeTop5Words(jobId.longValue(), statReportId.longValue());

            if (top != null) {
                top5WordsRepository.save(top);
            }

            job.setStatus(StatusEnum.done);
            parsingJobRepository.save(job);
        } catch (Exception ex) {

            job.setStatus(StatusEnum.error);
            parsingJobRepository.save(job);
            throw new RuntimeException("Failed to build reports for job " + jobId, ex);
        }
    }

    @Transactional(readOnly = true)
    public Top5Words computeTop5Words(Long jobId, Long statisticalReportId) {
        List<FeedbackObject> objects = feedbackObjectRepository.findByParsingJobId(jobId);
        if (objects.isEmpty()) {

            return buildTop5(statisticalReportId, List.of());
        }

        Map<String, Integer> freq = new HashMap<>();

        for (FeedbackObject fo : objects) {
            String s3Key = fo.getS3Key();
            try {
                byte[] bytes = minioStorageService.downloadBytes(FEEDBACKS_BUCKET, s3Key);
                JsonNode root = objectMapper.readTree(bytes);

                JsonNode feedback = root.has("feedback") ? root.get("feedback") : root;
                if (feedback != null && feedback.has("feedback_text")) {
                    String text = feedback.get("feedback_text").asText("");
                    accumulateFrequencies(freq, text);
                }
            } catch (Exception e) {

            }
        }

        List<Map.Entry<String, Integer>> sorted = freq.entrySet().stream()
                .sorted((a, b) -> Integer.compare(b.getValue(), a.getValue()))
                .limit(5)
                .toList();

        return buildTop5(statisticalReportId, sorted);
    }

    private void accumulateFrequencies(Map<String, Integer> freq, String text) {
        if (text == null || text.isBlank())
            return;

        String normalized = text.toLowerCase()
                .replaceAll("[^\\p{L}\\p{Nd}\\s]", " ")
                .replaceFirst(ADVANTAGES_TEXT, "")
                .replaceFirst(DISADVANTAGES_TEXT, "")
                .replaceFirst(COMMENTS_TEXT, "");

        for (String token : normalized.split("\\s+")) {
            if (token.length() < 2)
                continue;
            if (STOPWORDS.contains(token))
                continue;
            freq.merge(token, 1, Integer::sum);
        }
    }

    private Top5Words buildTop5(Long statisticalReportId, List<Map.Entry<String, Integer>> top) {

        String[] words = new String[5];
        Integer[] counts = new Integer[5];
        for (int i = 0; i < 5; i++) {
            if (i < top.size()) {
                words[i] = top.get(i).getKey();
                counts[i] = top.get(i).getValue();
            } else {
                words[i] = "";
                counts[i] = 1;
            }
        }

        return Top5Words.builder()
                .statisticalReport(StatisticalReport.builder().id(statisticalReportId).build())
                .word1(words[0]).word1Count(counts[0])
                .word2(words[1]).word2Count(counts[1])
                .word3(words[2]).word3Count(counts[2])
                .word4(words[3]).word4Count(counts[3])
                .word5(words[4]).word5Count(counts[4])
                .build();
    }
}
