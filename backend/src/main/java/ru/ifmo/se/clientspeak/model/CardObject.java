package ru.ifmo.se.clientspeak.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "card_object")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CardObject {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "parsing_job_id")
    private ParsingJob parsingJob;

    @Column(name = "s3_key", nullable = false, unique = true)
    private String s3Key;

    @Column(nullable = false)
    private String checksum;
}
