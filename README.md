# Diet Tracker

Log meals, track calories and macros per day, and set a daily calorie goal.

**Stack:** Spring Boot 3 (Java 17) · Spring Security + JWT · Spring Data JPA · PostgreSQL · React 18 + Vite · Docker Compose

## Run it
```bash
docker compose up --build
```
Open http://localhost:3000, create an account, and start logging.

**Without Docker:** start PostgreSQL (db `diettracker`, user/password `diet`), run `mvn spring-boot:run` in `backend/`, then `npm install && npm run dev` in `frontend/` (Vite proxies `/api` to port 8080).

## API
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | no | Create account, returns a JWT |
| POST | `/api/auth/login` | no | Log in, returns a JWT |
| GET | `/api/me` | yes | Username and daily goal |
| PUT | `/api/me/goal` | yes | Update daily calorie goal |
| GET | `/api/meals?date=YYYY-MM-DD` | yes | Meals for one day |
| POST | `/api/meals` | yes | Add a meal |
| DELETE | `/api/meals/{id}` | yes | Remove one of your meals |

## Design decisions (worth being able to explain)
- **Stateless auth:** the server signs a JWT (HS256, 24h expiry) at login. `JwtFilter` validates it on every request and sets the user in Spring Security's context. No server-side sessions.
- **Passwords** are hashed with BCrypt, never stored in plain text.
- **Authorization:** every query is scoped to the logged-in user, and deleting a meal checks that it belongs to them (otherwise 404).
- **Validation:** request bodies use Bean Validation (`@Valid`), so bad input returns 400 before touching the database.
- **One origin:** nginx serves the React build and proxies `/api` to the backend, so there is no CORS setup. Vite's dev proxy does the same in development.
- **Schema:** Hibernate `ddl-auto=update` creates tables on startup. Fine for a project this size; a real deployment would use migrations (Flyway).

## Ideas to extend it
Weekly chart of calories, meal search/favorites, unit tests for `MealController`, Flyway migrations, refresh tokens.
