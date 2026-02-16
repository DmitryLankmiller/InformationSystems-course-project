package ru.ifmo.se.clientspeak.dto;

import java.time.LocalDateTime;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParsingJobFullDTO {
    private Long id;
    private String name;
    private String description;
    private String status;
    private LocalDateTime createdAt;

    private Integer feedbacksPerItemLimit;
    private String feedbacksSortType;
    private String searchType;

    private List<String> links;

    private String searchInput;
    private Integer itemsLimit;
    private String itemsSortType;
    private Boolean linksCollected;

    private List<FeedbackDTO> feedbacks;
    private List<AiReportDTO> aiReports;
    private List<StatisticalReportDTO> statisticalReports;
    private List<CardDTO> cards;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FeedbackDTO {
        private Long id;
        private Short starsRating;
        private String feedbackState;
        private LocalDateTime feedbackDate;
        private String rawJson;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AiReportDTO {
        private Long id;
        private String aiAnswer;
        private Long durationS;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CardDTO {
        private Long id;
        private String text;
        private String checksum;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StatisticalReportDTO {
        private Long id;
        private Integer feedbacksCount;

        private StarsCountDTO starsCount;
        private FeedbackStatesCountDTO feedbackStatesCount;
        private Top5WordsDTO top5Words;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StarsCountDTO {
        private Integer star1Count;
        private Integer star2Count;
        private Integer star3Count;
        private Integer star4Count;
        private Integer star5Count;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class FeedbackStatesCountDTO {
        private Integer purchasedCount;
        private Integer returnedCount;
        private Integer canceledCount;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Top5WordsDTO {
        private String word1;
        private Integer word1Count;
        private String word2;
        private Integer word2Count;
        private String word3;
        private Integer word3Count;
        private String word4;
        private Integer word4Count;
        private String word5;
        private Integer word5Count;
    }
}
