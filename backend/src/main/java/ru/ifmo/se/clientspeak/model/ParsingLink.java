package ru.ifmo.se.clientspeak.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "parsing_link")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParsingLink {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "parsing_job_id")
    private ParsingJob parsingJob;

    @Column(nullable = false)
    private String url;

    @Column(name = "is_parsed", nullable = false)
    private boolean isParsed;

    @Column(name = "last_updated", nullable = false)
    private LocalDateTime lastUpdated;
}
