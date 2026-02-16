package ru.ifmo.se.clientspeak.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.Set;

@Entity
@Table(name = "project")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Project {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    private String description;

    @OneToMany(mappedBy = "project")
    private Set<UserPerProject> users;

    @OneToMany(mappedBy = "project")
    private Set<ParsingJob> parsingJobs;
}
