package ru.ifmo.se.clientspeak.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.ifmo.se.clientspeak.dto.ParsingJobCreateDTO;
import ru.ifmo.se.clientspeak.dto.ParsingJobFullDTO;
import ru.ifmo.se.clientspeak.dto.ParsingJobResponseDTO;
import ru.ifmo.se.clientspeak.dto.ParsingJobSummaryDTO;
import ru.ifmo.se.clientspeak.dto.ParsingJobUpdateDTO;
import ru.ifmo.se.clientspeak.service.ParsingJobOrchestrationService;
import ru.ifmo.se.clientspeak.service.ParsingJobService;
import ru.ifmo.se.clientspeak.service.AiOrchestrationService;

import java.util.List;

@RestController
@RequestMapping("/api/parsing-jobs")
@RequiredArgsConstructor
public class ParsingJobController {
    private final ParsingJobService parsingJobService;
    private final ParsingJobOrchestrationService orchestrationService;
    private final AiOrchestrationService aiOrchestrationService;

    @GetMapping
    public ResponseEntity<List<ParsingJobSummaryDTO>> list() {
        var list = parsingJobService.listAllSummaries();
        if (list.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<ParsingJobResponseDTO> create(@RequestBody ParsingJobCreateDTO dto) {
        try {
            var created = parsingJobService.createParsingJob(dto);
            return ResponseEntity.status(201).body(created);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(null);
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(null);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<ParsingJobFullDTO> getFull(@PathVariable Long id) {
        var dto = orchestrationService.getFullParsingJob(id);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody ParsingJobUpdateDTO updateDto) {
        try {
            var updated = orchestrationService.updateParsingJob(id, updateDto);
            return ResponseEntity.ok(updated);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(e.getMessage());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<?> start(@PathVariable Long id) {
        try {
            orchestrationService.startParsingJob(id);
            return ResponseEntity.accepted().build();
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to start job");
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            parsingJobService.deleteParsingJob(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(404).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to delete job");
        }
    }

    @PostMapping("/{id}/ai/analyze")
    public ResponseEntity<?> analyzeAi(@PathVariable Long id) {
        try {
            var report = aiOrchestrationService.runAiAnalysis(id);
            return ResponseEntity.ok(ParsingJobFullDTO.AiReportDTO.builder()
                    .id(report.getId())
                    .aiAnswer(report.getAiAnswer())
                    .durationS(report.getDurationS())
                    .createdAt(report.getCreatedAt())
                    .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to run AI analysis");
        }
    }

    @PostMapping("/{id}/ai/card")
    public ResponseEntity<?> generateCard(@PathVariable Long id) {
        try {
            var card = aiOrchestrationService.generateCard(id);
            var cards = aiOrchestrationService.getCards(id);
            var latest = cards.stream().filter(c -> c.id().equals(card.getId())).findFirst().orElse(null);
            if (latest == null) {
                return ResponseEntity.ok(ParsingJobFullDTO.CardDTO.builder()
                        .id(card.getId())
                        .text("")
                        .checksum(card.getChecksum())
                        .build());
            }
            return ResponseEntity.ok(ParsingJobFullDTO.CardDTO.builder()
                    .id(latest.id())
                    .text(latest.text())
                    .checksum(latest.checksum())
                    .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Failed to generate card");
        }
    }

}
