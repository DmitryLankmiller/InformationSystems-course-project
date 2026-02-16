package ru.ifmo.se.clientspeak.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "liked_cards")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LikedCards {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private AppUser user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "card_object_id")
    private CardObject cardObject;
}
