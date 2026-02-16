package ru.ifmo.se.clientspeak.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.ifmo.se.clientspeak.model.Project;
import ru.ifmo.se.clientspeak.repository.ProjectRepository;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
@RequiredArgsConstructor
public class ProjectController {
    private final ProjectRepository projectRepository;

    @PostMapping
    public ResponseEntity<Project> create(@RequestBody Project p) {
        return ResponseEntity.ok(projectRepository.save(p));
    }

    @GetMapping
    public ResponseEntity<List<Project>> list() {
        return ResponseEntity.ok(projectRepository.findAll());
    }
}
