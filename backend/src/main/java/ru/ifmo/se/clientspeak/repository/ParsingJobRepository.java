package ru.ifmo.se.clientspeak.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.ifmo.se.clientspeak.model.ParsingJob;

public interface ParsingJobRepository extends JpaRepository<ParsingJob, Long> {
}
