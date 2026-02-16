package ru.ifmo.se.clientspeak.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "top_5_words")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Top5Words {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "statistical_report_id")
    private StatisticalReport statisticalReport;

    @Column(name = "word_1", nullable = false)
    private String word1;

    @Column(name = "word_1_count", nullable = false)
    private Integer word1Count;

    @Column(name = "word_2", nullable = false)
    private String word2;

    @Column(name = "word_2_count", nullable = false)
    private Integer word2Count;

    @Column(name = "word_3", nullable = false)
    private String word3;

    @Column(name = "word_3_count", nullable = false)
    private Integer word3Count;

    @Column(name = "word_4", nullable = false)
    private String word4;

    @Column(name = "word_4_count", nullable = false)
    private Integer word4Count;

    @Column(name = "word_5", nullable = false)
    private String word5;

    @Column(name = "word_5_count", nullable = false)
    private Integer word5Count;
}
