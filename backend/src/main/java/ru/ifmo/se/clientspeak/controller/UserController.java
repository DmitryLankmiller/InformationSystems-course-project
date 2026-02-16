package ru.ifmo.se.clientspeak.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.ifmo.se.clientspeak.model.AppUser;
import ru.ifmo.se.clientspeak.repository.AppUserRepository;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final AppUserRepository appUserRepository;

    @PostMapping
    public ResponseEntity<AppUser> create(@RequestBody AppUser user) {
        return ResponseEntity.ok(appUserRepository.save(user));
    }

    @GetMapping
    public ResponseEntity<List<AppUser>> list() {
        return ResponseEntity.ok(appUserRepository.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppUser> get(@PathVariable Long id) {
        return ResponseEntity.of(appUserRepository.findById(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        appUserRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
