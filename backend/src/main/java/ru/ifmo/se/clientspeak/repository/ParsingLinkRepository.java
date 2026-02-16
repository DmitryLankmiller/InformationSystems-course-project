package ru.ifmo.se.clientspeak.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.ifmo.se.clientspeak.model.ParsingLink;

public interface ParsingLinkRepository extends JpaRepository<ParsingLink, Long> {
    List<ParsingLink> findByParsingJobId(Long parsingJobId);

    void deleteByParsingJobId(Long parsingJobId);

    boolean existsByParsingJobIdAndUrl(Long parsingJobId, String url);
}
