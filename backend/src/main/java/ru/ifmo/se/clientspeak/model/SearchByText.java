package ru.ifmo.se.clientspeak.model;

import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "search_by_text")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SearchByText {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "parsing_job_id")
    private ParsingJob parsingJob;

    @Column(name = "search_input", nullable = false)
    private String searchInput;

    @Column(name = "items_limit")
    private Integer itemsLimit;

    @Enumerated(EnumType.STRING)
    @Column(name = "items_sort_type", nullable = false)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    private ru.ifmo.se.clientspeak.model.enums.SortTypeEnum itemsSortType;

    @Column(name = "links_collected", nullable = false)
    private boolean linksCollected;
}
