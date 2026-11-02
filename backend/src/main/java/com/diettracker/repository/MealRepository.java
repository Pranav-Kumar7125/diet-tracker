package com.diettracker.repository;

import com.diettracker.model.Meal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MealRepository extends JpaRepository<Meal, Long> {
    List<Meal> findByUserIdAndDateOrderByIdAsc(Long userId, LocalDate date);
}
