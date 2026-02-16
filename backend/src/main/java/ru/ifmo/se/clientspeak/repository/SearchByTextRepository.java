package ru.ifmo.se.clientspeak.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.ifmo.se.clientspeak.model.SearchByText;

public interface SearchByTextRepository extends JpaRepository<SearchByText, Long> {
    List<SearchByText> findByParsingJobId(Long parsingJobId);
    void deleteByParsingJobId(Long parsingJobId);
}
