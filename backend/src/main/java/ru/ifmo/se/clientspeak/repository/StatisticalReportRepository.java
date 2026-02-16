package ru.ifmo.se.clientspeak.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import ru.ifmo.se.clientspeak.model.StatisticalReport;

public interface StatisticalReportRepository extends JpaRepository<StatisticalReport, Long> {

    @Query(value = "SELECT create_stat_report(:pjId)", nativeQuery = true)
    Integer createStatReport(@Param("pjId") Integer parsingJobId);

    List<StatisticalReport> findByParsingJobId(Long parsingJobId);
}
