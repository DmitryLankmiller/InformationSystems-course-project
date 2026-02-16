package ru.ifmo.se.clientspeak.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.ifmo.se.clientspeak.model.FeedbackStatesCount;

public interface FeedbackStatesCountRepository extends JpaRepository<FeedbackStatesCount, Long> {
    FeedbackStatesCount findByStatisticalReportId(Long statisticalReportId);
}
