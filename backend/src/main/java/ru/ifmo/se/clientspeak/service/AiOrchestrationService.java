package ru.ifmo.se.clientspeak.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import ru.ifmo.se.clientspeak.model.AiReport;
import ru.ifmo.se.clientspeak.model.CardObject;
import ru.ifmo.se.clientspeak.model.FeedbackObject;
import ru.ifmo.se.clientspeak.model.ParsingJob;
import ru.ifmo.se.clientspeak.repository.AiReportRepository;
import ru.ifmo.se.clientspeak.repository.CardObjectRepository;
import ru.ifmo.se.clientspeak.repository.FeedbackObjectRepository;
import ru.ifmo.se.clientspeak.repository.ParsingJobRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AiOrchestrationService {

    private final ParsingJobRepository parsingJobRepository;
    private final FeedbackObjectRepository feedbackObjectRepository;
    private final AiReportRepository aiReportRepository;
    private final CardObjectRepository cardObjectRepository;
    private final MinioStorageService minioStorageService;
    private final ObjectMapper objectMapper;

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.ai.enabled:false}")
    private boolean aiEnabled;

    @Value("${app.ai.base-url:}")
    private String aiBaseUrl;

    @Value("${app.ai.api-key:}")
    private String aiApiKey;

    @Value("${app.ai.folder-id:}")
    private String aiFolderId;

    @Value("${app.ai.prompt-id:}")
    private String aiPromptId;

    @Value("${app.ai.model:}")
    private String aiModel;

    public AiReport runAiAnalysis(Long jobId) {
        long startMs = System.currentTimeMillis();

        ParsingJob job = parsingJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("job not found"));

        List<FeedbackSample> samples = loadFeedbackSamples(jobId, 50);
        String prompt = buildAnalysisPrompt(job, samples);

        String aiAnswer = callAiOrStub(prompt);

        long durationS = (System.currentTimeMillis() - startMs) / 1000;

        AiReport report = AiReport.builder()
                .parsingJob(job)
                .aiAnswer(aiAnswer)
                .durationS(durationS)
                .createdAt(LocalDateTime.now())
                .build();

        return aiReportRepository.save(report);
    }

    public CardObject generateCard(Long jobId) throws Exception {
        ParsingJob job = parsingJobRepository.findById(jobId)
                .orElseThrow(() -> new IllegalArgumentException("job not found"));

        List<FeedbackSample> samples = loadFeedbackSamples(jobId, 40);
        String prompt = buildCardPrompt(job, samples);

        String cardText = callAiOrStub(prompt);

        byte[] bytes = cardText.getBytes(StandardCharsets.UTF_8);
        String checksum = md5(bytes);

        String key = "card_job_" + jobId + "_" + System.currentTimeMillis() + ".txt";
        minioStorageService.uploadBytes("cards", key, bytes, "text/plain");

        CardObject card = CardObject.builder()
                .parsingJob(job)
                .s3Key(key)
                .checksum(checksum)
                .build();

        return cardObjectRepository.save(card);
    }

    public List<CardRecord> getCards(Long jobId) {
        var cards = cardObjectRepository.findByParsingJobId(jobId);
        List<CardRecord> result = new ArrayList<>();
        for (CardObject c : cards) {
            String text = "";
            try {
                byte[] bytes = minioStorageService.downloadBytes("cards", c.getS3Key());
                text = new String(bytes, StandardCharsets.UTF_8);
            } catch (Exception ignored) {
            }
            result.add(new CardRecord(c.getId(), text, c.getChecksum()));
        }
        return result;
    }

    private List<FeedbackSample> loadFeedbackSamples(Long jobId, int limit) {
        List<FeedbackObject> objects = feedbackObjectRepository.findByParsingJobId(jobId);

        List<FeedbackSample> parsed = new ArrayList<>();
        for (FeedbackObject fo : objects) {
            String text = "";
            try {
                byte[] bytes = minioStorageService.downloadBytes("feedbacks", fo.getS3Key());
                JsonNode node = objectMapper.readTree(bytes);
                text = pickTextFromJson(node);
            } catch (Exception ignored) {
            }

            int stars = fo.getStarsRating() != null ? fo.getStarsRating() : 0;
            LocalDateTime dt = fo.getFeedbackDate();

            parsed.add(new FeedbackSample(stars, dt, text));
        }

        List<FeedbackSample> negatives = parsed.stream()
                .filter(f -> f.stars <= 2 && f.text != null && !f.text.isBlank())
                .sorted(Comparator.comparing((FeedbackSample f) -> f.stars)
                        .thenComparing(f -> f.date, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(10)
                .toList();

        List<FeedbackSample> positives = parsed.stream()
                .filter(f -> f.stars >= 4 && f.text != null && !f.text.isBlank())
                .sorted(Comparator.comparing((FeedbackSample f) -> f.stars).reversed()
                        .thenComparing(f -> f.date, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(10)
                .toList();

        List<FeedbackSample> latest = parsed.stream()
                .filter(f -> f.text != null && !f.text.isBlank())
                .sorted(Comparator.comparing((FeedbackSample f) -> f.date,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(20)
                .toList();

        List<FeedbackSample> merged = new ArrayList<>();
        merged.addAll(negatives);
        merged.addAll(positives);
        merged.addAll(latest);

        List<FeedbackSample> unique = new ArrayList<>();
        for (FeedbackSample f : merged) {
            if (unique.size() >= limit)
                break;
            boolean exists = unique.stream()
                    .anyMatch(u -> (u.text != null && u.text.equals(f.text) && u.stars == f.stars));
            if (!exists)
                unique.add(f);
        }

        return unique;
    }

    private String buildAnalysisPrompt(ParsingJob job, List<FeedbackSample> samples) {
        StringBuilder sb = new StringBuilder();
        sb.append("Ты аналитик отзывов. На основе отзывов о товаре сделай отчет.\n");
        sb.append("Нужно:\n");
        sb.append("1) Плюсы товара точечным списком\n");
        sb.append("2) Минусы товара точечным списком\n");
        sb.append("3) Боли покупателей\n");
        sb.append("4) Предложения по улучшению\n");
        sb.append("5) Топ формулировок, которые можно использовать в карточке товара\n");
        sb.append("\n");
        sb.append("Данные:\n");
        int i = 1;
        for (FeedbackSample f : samples) {
            sb.append(i).append(") ").append("stars=").append(f.stars).append(" text=").append(cleanText(f.text))
                    .append("\n");
            i++;
        }
        return sb.toString();
    }

    private String buildCardPrompt(ParsingJob job, List<FeedbackSample> samples) {
        StringBuilder sb = new StringBuilder();
        sb.append("Сгенерируй текст для карточки товара на маркетплейсе.\n");
        sb.append("Нужно:\n");
        sb.append("- Короткое описание (2-4 предложения)\n");
        sb.append("- Список преимуществ (5-8 пунктов)\n");
        sb.append("- Важные характеристики (5-8 пунктов)\n");
        sb.append("- Советы по использованию/уходу (если уместно)\n");
        sb.append("\n");
        sb.append("Используй отзывы клиентов.\n");
        sb.append("Отзывы:\n");
        int i = 1;
        for (FeedbackSample f : samples) {
            sb.append(i).append(") ").append("stars=").append(f.stars).append(" text=").append(cleanText(f.text))
                    .append("\n");
            i++;
        }
        return sb.toString();
    }

    private String callAiOrStub(String prompt) {
        System.out.println("DEBUG: Config check, aiEnabledValue: " + aiEnabled);
        if (!aiEnabled) {
            return stubAnswer(prompt);
        }
        if (aiBaseUrl == null || aiBaseUrl.isBlank()) {
            return stubAnswer(prompt);
        }
        if (aiApiKey == null || aiApiKey.isBlank()) {
            return stubAnswer(prompt);
        }

        String url = aiBaseUrl.endsWith("/") ? (aiBaseUrl + "responses") : (aiBaseUrl + "/responses");

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(aiApiKey);

            if (aiFolderId != null && !aiFolderId.isBlank()) {
                headers.set("OpenAI-Project", aiFolderId);
            }

            JsonNode bodyNode = buildResponsesRequestBody(prompt);
            HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(bodyNode), headers);

            String resp = restTemplate.postForObject(url, entity, String.class);
            if (resp == null || resp.isBlank()) {
                return stubAnswer(prompt);
            }

            return extractTextFromResponses(resp, prompt);
        } catch (Exception e) {
            return stubAnswer(prompt);
        }
    }

    private JsonNode buildResponsesRequestBody(String inputText) {
        var root = objectMapper.createObjectNode();

        if (aiPromptId != null && !aiPromptId.isBlank()) {
            var promptNode = objectMapper.createObjectNode();
            promptNode.put("id", aiPromptId);
            root.set("prompt", promptNode);
            root.put("input", inputText);
            return root;
        }

        if (aiModel != null && !aiModel.isBlank()) {
            root.put("model", aiModel);
            root.put("input", inputText);
            return root;
        }

        root.put("input", inputText);
        return root;
    }

    private String extractTextFromResponses(String respJson, String originalPrompt) {
        try {
            JsonNode node = objectMapper.readTree(respJson);

            if (node.has("output_text") && !node.get("output_text").isNull()) {
                String t = node.get("output_text").asText("");
                if (!t.isBlank())
                    return t;
            }

            if (node.has("output") && node.get("output").isArray()) {
                StringBuilder sb = new StringBuilder();
                for (JsonNode outItem : node.get("output")) {
                    if (!outItem.has("content"))
                        continue;
                    JsonNode content = outItem.get("content");
                    if (!content.isArray())
                        continue;

                    for (JsonNode c : content) {
                        String type = c.has("type") ? c.get("type").asText("") : "";
                        if ("output_text".equals(type) && c.has("text")) {
                            sb.append(c.get("text").asText(""));
                        } else if (c.has("text")) {
                            sb.append(c.get("text").asText(""));
                        }
                    }
                }
                String t = sb.toString().trim();
                if (!t.isBlank())
                    return t;
            }

            if (node.has("result"))
                return node.get("result").asText("");
            if (node.has("text"))
                return node.get("text").asText("");
            if (node.has("answer"))
                return node.get("answer").asText("");

            return respJson;
        } catch (Exception ignored) {
            return stubAnswer(originalPrompt);
        }
    }

    private String stubAnswer(String prompt) {
        return "AI (stub mode)\n"
                + "\n"
                + "Плюсы:\n"
                + "- Хорошее качество (по части отзывов)\n"
                + "- Удобство использования\n"
                + "\n"
                + "Минусы:\n"
                + "- Есть жалобы на размеры/посадку\n"
                + "- Иногда пишут про упаковку или доставку\n"
                + "\n"
                + "Боли покупателей:\n"
                + "- Хочется предсказуемый размер\n"
                + "- Хочется больше фото/описания\n"
                + "\n"
                + "Предложения по улучшению:\n"
                + "- Добавить таблицу размеров и советы по выбору\n"
                + "- Уточнить материалы и уход\n"
                + "\n"
                + "Топ формулировок:\n"
                + "- \"приятный материал\"\n"
                + "- \"удобная посадка\"\n"
                + "- \"качество на уровне\"\n";
    }

    private String pickTextFromJson(JsonNode node) {
        if (node == null)
            return "";
        if (node.has("text"))
            return node.get("text").asText("");
        if (node.has("comment"))
            return node.get("comment").asText("");
        if (node.has("feedbackText"))
            return node.get("feedbackText").asText("");
        if (node.has("body"))
            return node.get("body").asText("");
        return node.toString();
    }

    private String cleanText(String text) {
        if (text == null)
            return "";
        String t = text.replace("\n", " ").replace("\r", " ").trim();
        if (t.length() > 400)
            t = t.substring(0, 400) + "...";
        return t;
    }

    private String md5(byte[] bytes) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] d = md.digest(bytes);
            StringBuilder sb = new StringBuilder();
            for (byte b : d) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return "";
        }
    }

    private record FeedbackSample(int stars, LocalDateTime date, String text) {
    }

    public record CardRecord(Long id, String text, String checksum) {
    }
}
