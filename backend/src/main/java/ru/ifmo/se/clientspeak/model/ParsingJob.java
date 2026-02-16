package ru.ifmo.se.clientspeak.model;

import jakarta.persistence.*;
import lombok.*;
import ru.ifmo.se.clientspeak.model.enums.SearchTypeEnum;
import ru.ifmo.se.clientspeak.model.enums.SortTypeEnum;
import ru.ifmo.se.clientspeak.model.enums.StatusEnum;
import java.time.LocalDateTime;

import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

@Entity
@Table(name = "parsing_job")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParsingJob {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_creator_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private AppUser userCreator;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Project project;

    @Column(nullable = false, unique = true)
    private String name;

    private String description;

    @Column(nullable = false)
    private String website;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    private SearchTypeEnum searchType;

    @Column(name = "feedbacks_per_item_limit")
    private Integer feedbacksPerItemLimit;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(name = "feedbacks_sort_type", columnDefinition = "sort_type_enum")
    private SortTypeEnum feedbacksSortType;

    @Enumerated(EnumType.STRING)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    @Column(nullable = false, columnDefinition = "status_enum")
    private StatusEnum status;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "last_updated", nullable = false)
    private LocalDateTime lastUpdated;
}
