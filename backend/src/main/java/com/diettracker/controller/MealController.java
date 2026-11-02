package com.diettracker.controller;

import com.diettracker.model.Meal;
import com.diettracker.model.User;
import com.diettracker.repository.MealRepository;
import com.diettracker.repository.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class MealController {
    public record MealIn(@NotBlank String name, @Min(0) int calories, @Min(0) int protein,
                         @Min(0) int carbs, @Min(0) int fat, LocalDate date) {}
    public record Me(String username, int dailyGoal) {}
    public record Goal(@Min(500) @Max(10000) int dailyGoal) {}

    private final UserRepository users;
    private final MealRepository meals;

    private User current(Authentication auth) {
        return users.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    @GetMapping("/me")
    public Me me(Authentication auth) {
        User u = current(auth);
        return new Me(u.getUsername(), u.getDailyGoal());
    }

    @PutMapping("/me/goal")
    public Me setGoal(Authentication auth, @Valid @RequestBody Goal g) {
        User u = current(auth);
        u.setDailyGoal(g.dailyGoal());
        users.save(u);
        return new Me(u.getUsername(), u.getDailyGoal());
    }

    @GetMapping("/meals")
    public List<Meal> list(Authentication auth,
                           @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return meals.findByUserIdAndDateOrderByIdAsc(current(auth).getId(), date);
    }

    @PostMapping("/meals")
    public Meal add(Authentication auth, @Valid @RequestBody MealIn in) {
        Meal m = new Meal();
        m.setUserId(current(auth).getId());
        m.setName(in.name());
        m.setCalories(in.calories());
        m.setProtein(in.protein());
        m.setCarbs(in.carbs());
        m.setFat(in.fat());
        m.setDate(in.date() != null ? in.date() : LocalDate.now());
        return meals.save(m);
    }

    @DeleteMapping("/meals/{id}")
    public void delete(Authentication auth, @PathVariable Long id) {
        Long userId = current(auth).getId();
        // Ownership check: users can only delete their own meals.
        Meal m = meals.findById(id)
                .filter(x -> x.getUserId().equals(userId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Meal not found"));
        meals.delete(m);
    }
}
