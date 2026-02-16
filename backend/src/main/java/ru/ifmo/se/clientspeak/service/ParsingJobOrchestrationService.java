package ru.ifmo.se.clientspeak.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.ifmo.se.clientspeak.dto.*;
import ru.ifmo.se.clientspeak.model.*;
import ru.ifmo.se.clientspeak.model.enums.SearchTypeEnum;
import ru.ifmo.se.clientspeak.model.enums.StatusEnum;
import ru.ifmo.se.clientspeak.model.enums.SortTypeEnum;
import ru.ifmo.se.clientspeak.repository.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ParsingJobOrchestrationService {
    private final ParsingJobRepository parsingJobRepository;
    private final ParsingLinkRepository parsingLinkRepository;
    private final SearchByTextRepository searchByTextRepository;
    private final StatisticalReportRepository statisticalReportRepository;
    private final StarsCountRepository starsCountRepository;
    private final FeedbackStatesCountRepository feedbackStatesCountRepository;
    private final Top5WordsRepository top5WordsRepository;
    private final FeedbackObjectRepository feedbackObjectRepository;
    private final AiReportRepository aiReportRepository;
    private final CardObjectRepository cardObjectRepository;
    private final KafkaPublisher kafkaPublisher;
    private final MinioStorageService minioStorageService;

    @Transactional(readOnly = true)
    public ParsingJobFullDTO getFullParsingJob(Long id) {

        ParsingJob job = parsingJobRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("job not found"));

        var links = parsingLinkRepository.findByParsingJobId(id)
                .stream()
                .map(pl -> pl.getUrl())
                .toList();

        var sByTextList = searchByTextRepository.findByParsingJobId(id);
        SearchByText sByText = sByTextList.isEmpty() ? null : sByTextList.get(0);

        var feedbackObjects = feedbackObjectRepository.findByParsingJobId(id);

        var feedbackDTOs = feedbackObjects.stream().map(f -> {
            String rawJson = null;
            try {

                byte[] bytes = minioStorageService.downloadBytes(
                        "feedbacks",
                        f.getS3Key());
                rawJson = new String(bytes);
            } catch (Exception e) {

                rawJson = "{\"error\": \"failed_to_load_from_s3\"}";
            }

            return ParsingJobFullDTO.FeedbackDTO.builder()
                    .id(f.getId())
                    .starsRating(f.getStarsRating())
                    .feedbackState(f.getFeedbackState() != null ? f.getFeedbackState().name() : null)
                    .feedbackDate(f.getFeedbackDate())
                    .rawJson(rawJson)
                    .build();
        }).toList();

        var aiReportsDTO = aiReportRepository.findByParsingJobId(id)
                .stream()
                .map(a -> ParsingJobFullDTO.AiReportDTO.builder()
                        .id(a.getId())
                        .aiAnswer(a.getAiAnswer())
                        .durationS(a.getDurationS())
                        .createdAt(a.getCreatedAt())
                        .build())
                .toList();

        var statReports = statisticalReportRepository.findByParsingJobId(id);

        var statReportsDTO = statReports.stream().map(stat -> {

            var starsCount = starsCountRepository.findByStatisticalReportId(stat.getId());
            var feedbackStatesCount = feedbackStatesCountRepository.findByStatisticalReportId(stat.getId());
            var top5Words = top5WordsRepository.findByStatisticalReportId(stat.getId());

            ParsingJobFullDTO.StarsCountDTO starsDTO = null;
            if (starsCount != null) {
                starsDTO = ParsingJobFullDTO.StarsCountDTO.builder()
                        .star1Count(starsCount.getStar1Count())
                        .star2Count(starsCount.getStar2Count())
                        .star3Count(starsCount.getStar3Count())
                        .star4Count(starsCount.getStar4Count())
                        .star5Count(starsCount.getStar5Count())
                        .build();
            }

            ParsingJobFullDTO.FeedbackStatesCountDTO feedbackStatesDTO = null;
            if (feedbackStatesCount != null) {
                feedbackStatesDTO = ParsingJobFullDTO.FeedbackStatesCountDTO.builder()
                        .purchasedCount(feedbackStatesCount.getPurchasedCount())
                        .returnedCount(feedbackStatesCount.getReturnedCount())
                        .canceledCount(feedbackStatesCount.getCanceledCount())
                        .build();
            }

            ParsingJobFullDTO.Top5WordsDTO top5WordsDTO = null;
            if (top5Words != null) {
                top5WordsDTO = ParsingJobFullDTO.Top5WordsDTO.builder()
                        .word1(top5Words.getWord1())
                        .word1Count(top5Words.getWord1Count())
                        .word2(top5Words.getWord2())
                        .word2Count(top5Words.getWord2Count())
                        .word3(top5Words.getWord3())
                        .word3Count(top5Words.getWord3Count())
                        .word4(top5Words.getWord4())
                        .word4Count(top5Words.getWord4Count())
                        .word5(top5Words.getWord5())
                        .word5Count(top5Words.getWord5Count())
                        .build();
            }

            return ParsingJobFullDTO.StatisticalReportDTO.builder()
                    .id(stat.getId())
                    .feedbacksCount(stat.getFeedbacksCount())
                    .starsCount(starsDTO)
                    .feedbackStatesCount(feedbackStatesDTO)
                    .top5Words(top5WordsDTO)
                    .build();
        }).toList();

        var cardsDTO = cardObjectRepository.findByParsingJobId(id)
                .stream()
                .map(c -> {
                    String text;
                    try {
                        byte[] bytes = minioStorageService.downloadBytes("cards", c.getS3Key());
                        text = new String(bytes);
                    } catch (Exception e) {
                        text = "";
                    }
                    return ParsingJobFullDTO.CardDTO.builder()
                            .id(c.getId())
                            .text(text)
                            .checksum(c.getChecksum())
                            .build();
                }).toList();

        return ParsingJobFullDTO.builder()
                .id(job.getId())
                .name(job.getName())
                .description(job.getDescription())
                .status(job.getStatus() != null ? job.getStatus().name() : null)
                .createdAt(job.getCreatedAt())

                .feedbacksPerItemLimit(job.getFeedbacksPerItemLimit())
                .feedbacksSortType(job.getFeedbacksSortType() != null ? job.getFeedbacksSortType().name() : null)
                .searchType(job.getSearchType() != null ? job.getSearchType().name() : null)

                .links(links)
                .searchInput(sByText != null ? sByText.getSearchInput() : null)
                .itemsLimit(sByText != null ? sByText.getItemsLimit() : null)
                .itemsSortType(
                        sByText != null && sByText.getItemsSortType() != null
                                ? sByText.getItemsSortType().name()
                                : null)
                .linksCollected(sByText != null ? sByText.isLinksCollected() : null)

                .feedbacks(feedbackDTOs)
                .aiReports(aiReportsDTO)
                .statisticalReports(statReportsDTO)
                .cards(cardsDTO)

                .build();
    }

    @Transactional
    public ParsingJobFullDTO updateParsingJob(Long id, ParsingJobUpdateDTO dto) {
        var job = parsingJobRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("job not found"));
        if (job.getStatus() != StatusEnum.init) {
            throw new IllegalStateException("Only jobs in status INIT can be edited");
        }

        if (dto.getName() != null)
            job.setName(dto.getName());
        if (dto.getDescription() != null)
            job.setDescription(dto.getDescription());
        if (dto.getFeedbacksPerItemLimit() != null)
            job.setFeedbacksPerItemLimit(dto.getFeedbacksPerItemLimit());
        if (dto.getFeedbacksSortType() != null) {
            job.setFeedbacksSortType(SortTypeEnum.valueOf(dto.getFeedbacksSortType()));
        }
        if (dto.getSearchType() != null) {
            job.setSearchType(SearchTypeEnum.valueOf(dto.getSearchType()));
        }

        if (dto.getLinks() != null) {

            parsingLinkRepository.deleteByParsingJobId(job.getId());

            var newLinks = dto.getLinks().stream()
                    .map(url -> ParsingLink.builder()
                            .parsingJob(job)
                            .url(url)
                            .isParsed(false)
                            .lastUpdated(LocalDateTime.now())
                            .build())
                    .collect(Collectors.toList());

            parsingLinkRepository.saveAll(newLinks);
        }

        var sList = searchByTextRepository.findByParsingJobId(job.getId());
        if (!sList.isEmpty()) {
            var s = sList.get(0);
            boolean changed = false;
            if (dto.getSearchInput() != null) {
                s.setSearchInput(dto.getSearchInput());
                changed = true;
            }
            if (dto.getItemsLimit() != null) {
                s.setItemsLimit(dto.getItemsLimit());
                changed = true;
            }
            if (dto.getItemsSortType() != null) {
                s.setItemsSortType(SortTypeEnum.valueOf(dto.getItemsSortType()));
                changed = true;
            }
            if (changed)
                searchByTextRepository.save(s);
        } else if (dto.getSearchInput() != null) {
            var s = SearchByText.builder()
                    .parsingJob(job)
                    .searchInput(dto.getSearchInput())
                    .itemsLimit(dto.getItemsLimit())
                    .itemsSortType(dto.getItemsSortType() != null ? SortTypeEnum.valueOf(dto.getItemsSortType()) : null)
                    .linksCollected(false)
                    .build();
            searchByTextRepository.save(s);
        }

        parsingJobRepository.save(job);
        return getFullParsingJob(id);
    }

    @Transactional
    public void startParsingJob(Long id) {
        var job = parsingJobRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("job not found"));
        if (job.getStatus() != StatusEnum.init) {
            throw new IllegalStateException("Only jobs in INIT can be started");
        }

        boolean isByText = job.getSearchType() == SearchTypeEnum.by_text;
        if (isByText) {
            var sList = searchByTextRepository.findByParsingJobId(job.getId());
            var s = sList.isEmpty() ? null : sList.get(0);

            if (s == null || !s.isLinksCollected()) {
                job.setStatus(StatusEnum.collecting_links);
                parsingJobRepository.save(job);

                var payload = new HashMap<String, Object>();
                payload.put("jobId", job.getId());
                payload.put("type", "collect_links");
                payload.put("searchInput", s != null ? s.getSearchInput() : null);
                payload.put("itemsLimit", s != null ? s.getItemsLimit() : null);
                payload.put("itemsSortType",
                        s != null && s.getItemsSortType() != null ? s.getItemsSortType().name() : null);

                payload.put("feedbacksPerItemLimit", job.getFeedbacksPerItemLimit());
                payload.put("feedbacksSortType",
                        job.getFeedbacksSortType() != null ? job.getFeedbacksSortType().name() : null);

                kafkaPublisher.publishJob(payload);

                return;
            }
        }

        job.setStatus(StatusEnum.in_progress);
        parsingJobRepository.save(job);

        var parsingLinks = parsingLinkRepository.findByParsingJobId(job.getId());
        List<String> links;
        if (parsingLinks != null && !parsingLinks.isEmpty()) {
            links = parsingLinks.stream().map(ParsingLink::getUrl).collect(Collectors.toList());
        } else {

            var sList = searchByTextRepository.findByParsingJobId(job.getId());
            if (!sList.isEmpty()) {
                var s = sList.get(0);
                links = s.getSearchInput() != null ? List.of(s.getSearchInput()) : List.of();
            } else {
                links = List.of();
            }
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("jobId", job.getId());
        payload.put("type", "parse_links");
        payload.put("links", links);
        payload.put("feedbacksPerItemLimit", job.getFeedbacksPerItemLimit());
        payload.put("feedbacksSortType", job.getFeedbacksSortType() != null ? job.getFeedbacksSortType().name() : null);

        kafkaPublisher.publishJob(payload);

    }

}
