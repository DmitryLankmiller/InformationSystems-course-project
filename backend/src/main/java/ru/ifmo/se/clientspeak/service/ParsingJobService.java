package ru.ifmo.se.clientspeak.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.ifmo.se.clientspeak.dto.ParsingJobCreateDTO;
import ru.ifmo.se.clientspeak.dto.ParsingJobResponseDTO;
import ru.ifmo.se.clientspeak.dto.ParsingJobSummaryDTO;
import ru.ifmo.se.clientspeak.model.*;
import ru.ifmo.se.clientspeak.model.enums.SearchTypeEnum;
import ru.ifmo.se.clientspeak.model.enums.SortTypeEnum;
import ru.ifmo.se.clientspeak.repository.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class ParsingJobService {
    private final ParsingJobRepository parsingJobRepository;
    private final ParsingLinkRepository parsingLinkRepository;
    private final SearchByTextRepository searchByTextRepository;
    private final FeedbackObjectRepository feedbackObjectRepository;
    private final AppUserRepository appUserRepository;
    private final ProjectRepository projectRepository;
    private final MinioStorageService minioStorageService;

    public List<ParsingJobSummaryDTO> listAllSummaries() {
        return parsingJobRepository.findAll()
                .stream()
                .map(j -> new ParsingJobSummaryDTO(j.getId(), j.getName(), j.getDescription(), j.getWebsite(),
                        j.getStatus().name()))
                .sorted((pj1, pj2) -> {
                    if (pj1.getId() < pj2.getId()) {
                        return 1;
                    } else if (pj1.getId() > pj2.getId()) {
                        return -1;
                    }
                    return 0;
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public ParsingJobResponseDTO createParsingJob(ParsingJobCreateDTO dto) {

        if (dto.getName() == null || dto.getName().isBlank()) {
            throw new IllegalArgumentException("name is required");
        }
        if (dto.getCreatorId() == null) {
            throw new IllegalArgumentException("creatorId is required");
        }
        if (dto.getProjectId() == null) {
            throw new IllegalArgumentException("projectId is required");
        }
        var creator = appUserRepository.findById(dto.getCreatorId())
                .orElseThrow(() -> new IllegalArgumentException("creatorId not found"));
        var project = projectRepository.findById(dto.getProjectId())
                .orElseThrow(() -> new IllegalArgumentException("projectId not found"));

        String website = dto.getWebsite() == null || dto.getWebsite().isBlank() ? "wildberries" : dto.getWebsite();
        if (!website.equals("wildberries")) {
            throw new IllegalArgumentException("Unsupported website: " + website);
        }

        SearchTypeEnum searchType;
        try {
            searchType = SearchTypeEnum.valueOf(dto.getSearchType());
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid searchType, expected by_links or by_text");
        }

        SortTypeEnum feedbacksSort = null;
        if (dto.getFeedbacksSortType() != null) {
            try {
                feedbacksSort = SortTypeEnum.valueOf(dto.getFeedbacksSortType());
            } catch (Exception e) {
                throw new IllegalArgumentException("Invalid feedbacksSortType");
            }
        }

        ParsingJob createdJob = ParsingJob.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .website(website)
                .userCreator(creator)
                .project(project)
                .feedbacksPerItemLimit(dto.getFeedbacksPerItemLimit())
                .feedbacksSortType(feedbacksSort)
                .searchType(searchType)
                .status(ru.ifmo.se.clientspeak.model.enums.StatusEnum.init)
                .createdAt(LocalDateTime.now())
                .lastUpdated(LocalDateTime.now())
                .build();

        var job = parsingJobRepository.save(createdJob);

        if (searchType == SearchTypeEnum.by_links) {
            var links = dto.getLinks();
            if (links == null || links.isEmpty()) {
                throw new IllegalArgumentException("links must be provided when searchType is by_links");
            }
            var linkEntities = links.stream().map(url -> ParsingLink.builder()
                    .parsingJob(job)
                    .url(url)
                    .isParsed(false)
                    .lastUpdated(LocalDateTime.now())
                    .build())
                    .collect(Collectors.toList());
            parsingLinkRepository.saveAll(linkEntities);
        } else {
            if (dto.getSearchInput() == null || dto.getSearchInput().isBlank()) {
                throw new IllegalArgumentException("searchInput must be provided when searchType is by_text");
            }
            SortTypeEnum itemsSort = null;
            if (dto.getItemsSortType() != null) {
                try {
                    itemsSort = SortTypeEnum.valueOf(dto.getItemsSortType());
                } catch (Exception e) {
                    throw new IllegalArgumentException("Invalid itemsSortType");
                }
            }
            SearchByText s = SearchByText.builder()
                    .parsingJob(job)
                    .searchInput(dto.getSearchInput())
                    .itemsLimit(dto.getItemsLimit())
                    .itemsSortType(itemsSort)
                    .linksCollected(false)
                    .build();
            searchByTextRepository.save(s);
        }

        return new ParsingJobResponseDTO(job.getId(), job.getName(), job.getDescription(), job.getWebsite(),
                job.getStatus().name());
    }

    public void deleteParsingJob(Long id) {
        var job = parsingJobRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("ParsingJob not found: " + id));

        List<String> keys = feedbackObjectRepository.findS3KeysByParsingJobId(id);

        try {
            minioStorageService.deleteFeedbackObjects(keys);
        } catch (Exception e) {
            log.warn("MinIO cleanup failed for job {}: {}", id, e.getMessage());
        }

        parsingJobRepository.delete(job);
    }
}
