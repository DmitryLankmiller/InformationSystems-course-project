package ru.ifmo.se.clientspeak.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.ifmo.se.clientspeak.model.Project;

public interface ProjectRepository extends JpaRepository<Project, Long> {
}
