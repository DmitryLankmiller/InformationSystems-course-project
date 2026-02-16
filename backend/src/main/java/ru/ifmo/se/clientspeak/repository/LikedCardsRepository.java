package ru.ifmo.se.clientspeak.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.ifmo.se.clientspeak.model.LikedCards;

public interface LikedCardsRepository extends JpaRepository<LikedCards, Long> {
}
