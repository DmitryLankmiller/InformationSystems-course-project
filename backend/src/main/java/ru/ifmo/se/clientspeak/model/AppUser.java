package ru.ifmo.se.clientspeak.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Set;

@Entity
@Table(name = "app_user")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AppUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String login;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    private LocalDateTime lastLogin;

    @OneToMany(mappedBy = "userCreator")
    private Set<ParsingJob> parsingJobs;

    @OneToMany(mappedBy = "user")
    private Set<UserPerProject> projectsRelation;
}
