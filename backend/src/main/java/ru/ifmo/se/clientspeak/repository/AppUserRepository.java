package ru.ifmo.se.clientspeak.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.ifmo.se.clientspeak.model.AppUser;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
}
