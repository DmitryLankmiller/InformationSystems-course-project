package ru.ifmo.se.clientspeak.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.ifmo.se.clientspeak.model.Top5Words;

public interface Top5WordsRepository extends JpaRepository<Top5Words, Long> {
    Top5Words findByStatisticalReportId(Long statisticalReportId);
}
