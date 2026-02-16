package ru.ifmo.se.clientspeak.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "feedback_states_count")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackStatesCount {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "statistical_report_id")
    private StatisticalReport statisticalReport;

    @Column(name = "purchased_count", nullable = false)
    private Integer purchasedCount;

    @Column(name = "returned_count", nullable = false)
    private Integer returnedCount;

    @Column(name = "canceled_count", nullable = false)
    private Integer canceledCount;
}
