package ru.ifmo.se.clientspeak.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.ifmo.se.clientspeak.model.CardObject;

public interface CardObjectRepository extends JpaRepository<CardObject, Long> {
    List<CardObject> findByParsingJobId(Long parsingJobId);
}
