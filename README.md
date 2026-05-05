# Flowvisior

Flowvisior - это full-stack приложение для личной продуктивности с игровой логикой. Идея простая: пользователь планирует день, ведет привычки, двигается по большим целям через квесты и получает понятную обратную связь через streak, HP, XP, достижения, календарь и статистику.

Проект состоит из двух частей:

- `backend` - Spring Boot REST API.
- `frontend` - React + Vite клиент.

В разработке frontend работает на `http://localhost:5173`, backend - на `http://localhost:8080`. Все запросы frontend отправляет через `/api`, а Vite проксирует их на Spring Boot.

## Что умеет приложение

- Регистрация, вход, выход и авторизация через HTTP session.
- Ежедневный план: открыть день, добавить задачи, привычки и шаги квестов, отметить выполнение и закрыть день.
- Привычки с расписанием по дням недели.
- Квесты: большая цель разбивается на шаги, а в daily plan попадают именно шаги.
- Календарь с деталями каждого дня.
- История действий и личная статистика.
- Игровой профиль: HP, XP, уровень, streak, streak shield и достижения.
- Админские действия для управления статусом пользователя и игровыми значениями.

В проекте намеренно нет `difficulty`. HP и XP не начисляются за сложность задачи. Игровой прогресс идет через streak-логику и достижения.

## Быстрый запуск

Нужно установить:

- Java 21
- Node.js 20+
- npm
- PostgreSQL
- Git

### 1. Создать базу данных

Backend ожидает PostgreSQL на `localhost:1337` и базу `flowvisior`.

```sql
CREATE DATABASE flowvisior;
```

Пароль от PostgreSQL передается через переменную окружения `DB_PASSWORD`.

### 2. Запустить backend

Открой первый терминал:

```powershell
cd backend
$env:DB_PASSWORD="your_postgres_password"
.\mvnw.cmd spring-boot:run
```

Проверка:

```text
http://localhost:8080/api/health
```

Ожидаемый ответ:

```json
{"status":"ok"}
```

### 3. Запустить frontend

Открой второй терминал:

```powershell
cd frontend
npm install --no-audit --no-fund
npm run dev
```

После запуска открой:

```text
http://localhost:5173
```

Если открывать только `localhost:8080`, ты попадешь на backend. Само веб-приложение находится на `localhost:5173`.

## Настройки

Основные backend-настройки лежат в [backend/src/main/resources/application.properties](backend/src/main/resources/application.properties):

```properties
spring.datasource.url=jdbc:postgresql://localhost:1337/flowvisior
spring.datasource.username=postgres
spring.datasource.password=${DB_PASSWORD}
server.port=8080
```

Frontend по умолчанию использует:

```text
VITE_API_BASE=/api
```

Для локальной разработки это значение менять не нужно: Vite сам проксирует `/api` на `http://localhost:8080`.

## Структура

```text
flowvisior/
  backend/
    src/main/java/com/dcorp/flowvisior/
      config/          security config
      controller/      REST controllers
      dto/             request/response models
      entity/          JPA entities
      repository/      Spring Data repositories
      service/         business logic
    src/main/resources/
      db/migration/    Flyway migrations
      application.properties
    src/test/java/     backend tests

  frontend/
    src/api/           fetch client and API types
    src/assets/        icons and images
    src/components/    shared UI
    src/context/       auth/game/toast state
    src/pages/         app pages
    src/utils/         formatting and HP helpers

  docs/
  README.md
```

## Backend

Backend написан на Java 21 и Spring Boot 4.

Используется:

- Spring Web MVC для REST API.
- Spring Security для session-based auth.
- Spring Data JPA и Hibernate для работы с PostgreSQL.
- Flyway для миграций.
- Bean Validation для проверки входных DTO.
- Maven Wrapper для сборки и тестов.

Flyway применяет миграции автоматически при старте приложения. Hibernate работает в режиме проверки схемы, поэтому структура базы должна совпадать с миграциями.

Миграции:

```text
backend/src/main/resources/db/migration/
```

## Frontend

Frontend написан на React 18, TypeScript и Vite.

Используется:

- React Router для страниц.
- Native `fetch` для API-запросов.
- Context API для auth/game/toast состояния.
- CSS custom properties для темы и HP-состояний.

Основные страницы:

```text
/login
/register
/today
/habits
/quests
/calendar
/calendar/:date
/stats
/history
/profile
/admin
```

Главный пользовательский сценарий находится на `/today`: открыть день, собрать план, отметить пункты, закрыть день и увидеть изменения в игровом профиле.

## Игровая логика

В текущей модели XP и HP не зависят от сложности отдельных задач. Это сделано специально, чтобы приложение не заставляло пользователя вручную оценивать каждое действие.

Что происходит с daily plan item:

```text
complete -> пункт становится выполненным
fail     -> пункт становится проваленным
reset    -> пункт возвращается в ожидание
```

Игровые изменения происходят отдельно:

- при закрытии дня через streak-логику;
- при выдаче достижений;
- при использовании streak shield, если день был пропущен.

День считается продуктивным, если при закрытии есть хотя бы один выполненный пункт.

HP-состояния:

```text
GREAT       80-100
NORMAL      50-79
TIRED       30-49
EXHAUSTED   10-29
CRITICAL     0-9
```

Backend возвращает `hpState`, frontend применяет его к интерфейсу через `data-hp-state`.

## Авторизация и CSRF

Авторизация работает через HTTP session. Frontend отправляет запросы с `credentials: "include"`.

CSRF protection включен. Для изменяющих запросов (`POST`, `PATCH`, `DELETE`) frontend сначала получает token через:

```text
GET /api/csrf
```

Затем отправляет его в header:

```text
X-XSRF-TOKEN
```

Backend также использует cookie:

```text
XSRF-TOKEN
```

Для локальной разработки этого достаточно. Для production нужно отдельно проверить cookie flags (`SameSite`, `Secure`) и CORS под реальный домен.

## Основные API endpoints

Все endpoints начинаются с `/api`.

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
GET  /api/csrf
```

```text
GET /api/profile
GET /api/profile/achievements
GET /api/dashboard
```

```text
GET    /api/habits
POST   /api/habits
PATCH  /api/habits/{id}
PATCH  /api/habits/{id}/toggle-active
DELETE /api/habits/{id}
```

```text
GET    /api/quests
POST   /api/quests
GET    /api/quests/{id}
PATCH  /api/quests/{id}
DELETE /api/quests/{id}
GET    /api/quests/{id}/steps
PATCH  /api/quest-steps/{id}
```

```text
GET  /api/daily-plans/today
POST /api/daily-plans/today/start
POST /api/daily-plans/today/close
GET  /api/daily-plans/date/{date}
POST /api/daily-plans/date/{date}/start
POST /api/daily-plans/date/{date}/close
POST /api/daily-plans/{planId}/items
```

```text
POST  /api/daily-plan-items/{id}/complete
POST  /api/daily-plan-items/{id}/fail
POST  /api/daily-plan-items/{id}/reset
PATCH /api/daily-plan-items/{id}
```

```text
GET   /api/calendar?year=2026&month=5
GET   /api/stats
GET   /api/history?page=0&size=20
GET   /api/admin/users
PATCH /api/admin/users/{id}/status
PATCH /api/admin/users/{id}/game-stats
```

Admin endpoints требуют пользователя с ролью `ADMIN`.

## Тесты и проверки

Backend tests:

```powershell
cd backend
.\mvnw.cmd test
```

После крупных изменений лучше запускать clean-сборку:

```powershell
.\mvnw.cmd clean test
```

Frontend typecheck:

```powershell
cd frontend
npm run typecheck -- --pretty false
```

Frontend production build:

```powershell
cd frontend
npm run build
```

## Частые проблемы

### Firefox не открывает `localhost:5173`

Это значит, что frontend dev server не запущен. Backend на `8080` не поднимает React-приложение.

Запусти отдельно:

```powershell
cd frontend
npm run dev
```

### Backend не подключается к PostgreSQL

Проверь:

- PostgreSQL запущен.
- Порт действительно `1337`.
- База `flowvisior` создана.
- `DB_PASSWORD` установлен в том же терминале, где запускается backend.

### Flyway ругается на схему

Локальную базу можно пересоздать, если данные не важны:

```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'flowvisior'
  AND pid <> pg_backend_pid();

DROP DATABASE IF EXISTS flowvisior;
CREATE DATABASE flowvisior;
```

После этого перезапусти backend, и Flyway заново применит миграции.

### Login или register возвращает 401/403

Проверь, что:

- backend запущен на `http://localhost:8080`;
- frontend открыт через `http://localhost:5173`;
- запрос `GET /api/csrf` проходит успешно;
- браузер не блокирует cookies для localhost.

После изменений в auth/CSRF иногда проще перезапустить оба сервера и открыть сайт в приватном окне.

## Полезные команды

```powershell
# backend
cd backend
$env:DB_PASSWORD="your_postgres_password"
.\mvnw.cmd spring-boot:run
.\mvnw.cmd test
.\mvnw.cmd clean test
```

```powershell
# frontend
cd frontend
npm install --no-audit --no-fund
npm run dev
npm run typecheck -- --pretty false
npm run build
```

## Статус проекта

Flowvisior сейчас находится на этапе локального MVP: основная механика работает, frontend и backend связаны, авторизация и CSRF подключены, база управляется через Flyway, базовые backend-тесты добавлены.

Перед production-релизом стоит отдельно добавить Docker Compose, production-профиль настроек, полноценную документацию по API и более широкий набор frontend/backend тестов.
