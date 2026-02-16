package ru.ifmo.se.clientspeak.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "statistical_report")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StatisticalReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "parsing_job_id")
    private ParsingJob parsingJob;

    @Column(name = "feedbacks_count", nullable = false)
    private Integer feedbacksCount;
}
