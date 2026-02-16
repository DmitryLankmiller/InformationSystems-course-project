package ru.ifmo.se.clientspeak.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParsingJobUpdateDTO {
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
}
