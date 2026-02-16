package ru.ifmo.se.clientspeak.model;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "ai_report")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiReport {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "parsing_job_id")
    private ParsingJob parsingJob;

    @Column(name = "ai_answer", nullable = false, columnDefinition = "text")
    private String aiAnswer;

    @Column(name = "duration_s", nullable = false)
    private Long durationS;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}
