package ru.ifmo.se.clientspeak.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.ifmo.se.clientspeak.model.StarsCount;

public interface StarsCountRepository extends JpaRepository<StarsCount, Long> {
    StarsCount findByStatisticalReportId(Long statisticalReportId);
}
