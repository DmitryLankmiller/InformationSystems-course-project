package ru.ifmo.se.clientspeak.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ParsingJobSummaryDTO {
    private Long id;
    private String name;
    private String description;
    private String website;
    private String status;
}
