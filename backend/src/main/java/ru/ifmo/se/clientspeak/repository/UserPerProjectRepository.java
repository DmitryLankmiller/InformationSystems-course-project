package ru.ifmo.se.clientspeak.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.ifmo.se.clientspeak.model.UserPerProject;

public interface UserPerProjectRepository extends JpaRepository<UserPerProject, Long> {
}
