package ru.ifmo.se.clientspeak.model;

import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

import jakarta.persistence.*;
import lombok.*;
import ru.ifmo.se.clientspeak.model.enums.RoleEnum;

@Entity
@Table(name = "user_per_project")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPerProject {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private AppUser user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "project_id")
    private Project project;

    @Enumerated(EnumType.STRING)
    @Column(name = "user_role", nullable = false)
    @JdbcType(PostgreSQLEnumJdbcType.class)
    private RoleEnum userRole;
}
