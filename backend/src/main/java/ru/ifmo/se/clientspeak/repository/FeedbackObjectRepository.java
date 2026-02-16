package ru.ifmo.se.clientspeak.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import ru.ifmo.se.clientspeak.model.FeedbackObject;

public interface FeedbackObjectRepository extends JpaRepository<FeedbackObject, Long> {
    List<FeedbackObject> findByParsingJobId(Long parsingJobId);

    @Query("select f.s3Key from FeedbackObject f where f.parsingJob.id = :jobId")
    List<String> findS3KeysByParsingJobId(@Param("jobId") Long jobId);

    long countByParsingJobId(Long parsingJobId);
}
