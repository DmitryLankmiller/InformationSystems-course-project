package ru.ifmo.se.clientspeak.model;

import jakarta.persistence.*;
import lombok.*;
import ru.ifmo.se.clientspeak.model.enums.FeedbackStateEnum;

import java.time.LocalDateTime;

import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

@Entity
@Table(name = "feedback_object")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeedbackObject {
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

    @Column(name = "stars_rating", nullable = false)
    private Short starsRating;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "feedback_state", nullable = false, columnDefinition = "feedback_state_enum")
    private FeedbackStateEnum feedbackState;

    @Column(name = "feedback_date", nullable = false)
    private LocalDateTime feedbackDate;
}
