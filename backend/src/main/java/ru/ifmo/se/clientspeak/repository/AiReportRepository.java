package ru.ifmo.se.clientspeak.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import ru.ifmo.se.clientspeak.model.AiReport;

public interface AiReportRepository extends JpaRepository<AiReport, Long> {
    List<AiReport> findByParsingJobId(Long parsingJobId);
}
