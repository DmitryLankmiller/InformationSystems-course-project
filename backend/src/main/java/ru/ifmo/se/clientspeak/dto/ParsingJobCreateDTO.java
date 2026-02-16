package ru.ifmo.se.clientspeak.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
public class ParsingJobCreateDTO {
    private String name;
    private String description;
    private String website;
    private Integer feedbacksPerItemLimit;
    private String feedbacksSortType;
    private String searchType;

    private List<String> links;

    private String searchInput;
    private Integer itemsLimit;
    private String itemsSortType;

    private Long creatorId;
    private Long projectId;
}
