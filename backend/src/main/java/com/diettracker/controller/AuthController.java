package com.diettracker.controller;

import com.diettracker.model.User;
import com.diettracker.repository.UserRepository;
import com.diettracker.security.JwtUtil;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    public record Credentials(@NotBlank @Size(min = 3, max = 40) String username,
                              @NotBlank @Size(min = 6, max = 100) String password) {}
    public record Token(String token) {}

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtUtil jwt;

    @PostMapping("/register")
    public Token register(@Valid @RequestBody Credentials c) {
        if (users.existsByUsername(c.username())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "That username is taken");
        }
        User u = new User();
        u.setUsername(c.username());
        u.setPasswordHash(encoder.encode(c.password()));
        users.save(u);
        return new Token(jwt.generate(u.getUsername()));
    }

    @PostMapping("/login")
    public Token login(@Valid @RequestBody Credentials c) {
        User u = users.findByUsername(c.username())
                .filter(x -> encoder.matches(c.password(), x.getPasswordHash()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Wrong username or password"));
        return new Token(jwt.generate(u.getUsername()));
    }
}
