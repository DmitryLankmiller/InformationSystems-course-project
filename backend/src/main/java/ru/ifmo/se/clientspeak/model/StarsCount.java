package ru.ifmo.se.clientspeak.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "stars_count")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StarsCount {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "statistical_report_id")
    private StatisticalReport statisticalReport;

    @Column(name = "star_1_count", nullable = false)
    private Integer star1Count;

    @Column(name = "star_2_count", nullable = false)
    private Integer star2Count;

    @Column(name = "star_3_count", nullable = false)
    private Integer star3Count;

    @Column(name = "star_4_count", nullable = false)
    private Integer star4Count;

    @Column(name = "star_5_count", nullable = false)
    private Integer star5Count;
}
