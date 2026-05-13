# Flowvisior

Flowvisior — это небольшое fullstack-приложение для геймификации обычного дня. Идея простая: собрать задачи, привычки, квесты, фокус-сессии и прогресс персонажа в одном месте, чтобы день был похож не на бесконечный список дел, а на понятный маршрут.

Проект пока живой и развивающийся, поэтому внутри есть и продуктовые функции, и технические заметки для дальнейшей чистки. Но основа уже рабочая: backend на Spring Boot, frontend на React/Vite, данные в PostgreSQL, миграции через Flyway.

## Что умеет приложение

- регистрация, логин, сессии и CSRF-защита;
- главный экран Today с дневным планом;
- задачи с датой, planned time и deadline time;
- привычки с расписанием по дням недели;
- квесты с шагами, датами и прогрессом;
- календарь дней и просмотр конкретной даты;
- фокус-таймер и сохранение фокус-сессий;
- XP, уровень, HP, streak и shield;
- достижения, история действий и статистика;
- профиль с выбором персонажа и темы;
- админка для управления пользователями и игровыми статами;
- Telegram-интеграция: привязка аккаунта, `/today`, `/tomorrow`, напоминания и кнопки смены статуса.

## Стек

Backend:

- Java 21
- Spring Boot 4
- Spring Security
- Spring Data JPA / Hibernate
- Flyway
- PostgreSQL
- JUnit 6, Mockito, AssertJ

Frontend:

- React 18
- TypeScript
- Vite
- React Router
- CSS без отдельного UI-фреймворка

## Структура

```text
backend/
  src/main/java/com/dcorp/flowvisior/
    config/        security config
    controller/    REST API
    dto/           request/response DTO
    entity/        JPA entities
    repository/    Spring Data repositories
    service/       бизнес-логика
  src/main/resources/db/migration/
    V1...V18       Flyway migrations
  src/test/java/
    unit и context tests

frontend/
  src/api/         HTTP-клиент и типы API
  src/components/  переиспользуемые компоненты
  src/context/     auth/game/toast/achievement context
  src/pages/       страницы приложения
  src/styles/      CSS по слоям и страницам
  src/utils/       форматирование, планирование, таймеры
```

## Что нужно установить

- JDK 21
- Node.js 20+; у меня проект проверялся на Node 24
- PostgreSQL

Maven отдельно ставить не нужно: в `backend/` есть wrapper.

## База данных

По умолчанию backend ждёт PostgreSQL здесь:

```properties
jdbc:postgresql://localhost:1337/flowvisior
```

Пользователь по умолчанию:

```properties
postgres
```

Пароль backend берёт из переменной окружения `DB_PASSWORD`.

Минимально нужно создать базу `flowvisior` и дать доступ пользователю `postgres`. Например:

```bash
createdb -h localhost -p 1337 -U postgres flowvisior
```

Если PostgreSQL у тебя работает на другом порту или под другим пользователем, поменяй `backend/src/main/resources/application.properties`.

## Переменные окружения backend

Обязательная:

```text
DB_PASSWORD
```

Опциональные:

```text
JPA_SHOW_SQL=false
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_POLLING_ENABLED=true
TELEGRAM_DROP_PENDING_UPDATES=false
TELEGRAM_POLLING_TIMEOUT_SECONDS=25
TELEGRAM_REMINDERS_FIXED_DELAY_MS=60000
```

Если Telegram не нужен, просто не задавай `TELEGRAM_BOT_TOKEN`. Сервис стартует без бота и не будет ходить в Telegram API.

## Запуск backend

Windows PowerShell:

```powershell
cd backend
$env:DB_PASSWORD = "your_postgres_password"
.\mvnw.cmd spring-boot:run
```

macOS/Linux:

```bash
cd backend
export DB_PASSWORD=your_postgres_password
./mvnw spring-boot:run
```

Backend поднимется на:

```text
http://localhost:8080
```

Flyway применит миграции автоматически.

## Запуск frontend

```bash
cd frontend
npm install --no-audit --no-fund
npm run dev
```

Frontend откроется на:

```text
http://127.0.0.1:5173
```

Vite проксирует `/api` на `http://127.0.0.1:8080`, поэтому для локальной разработки отдельный CORS обычно не нужен.

Если backend находится не на стандартном адресе, создай `frontend/.env`:

```text
VITE_API_BASE=http://localhost:8080/api
```

Для обычного локального режима лучше оставить значение по умолчанию `/api`, чтобы работал Vite proxy.

## Telegram

Чтобы включить Telegram:

1. Создай бота через BotFather.
2. Задай backend-переменные:

```text
TELEGRAM_BOT_TOKEN=token_from_botfather
TELEGRAM_BOT_USERNAME=your_bot_username
```

3. Запусти backend.
4. В профиле приложения нажми "Подключить Telegram".
5. Открой deep link или отправь боту `/start <code>`.

Бот понимает команды:

```text
/today
/tomorrow
/status
/help
/unlink
```

При включённых напоминаниях бот присылает сообщения за 15 минут до planned/deadline time. Кнопки под сообщениями циклят статус пункта: pending -> completed -> failed -> pending.

## Проверки

Backend:

```powershell
cd backend
.\mvnw.cmd clean test
```

Frontend:

```powershell
cd frontend
npm.cmd run build
npm.cmd run audit:css
```

На macOS/Linux вместо `npm.cmd` используй обычный `npm`.

`audit:css` не падает из-за качества CSS. Это обзорный скрипт: он показывает размер CSS, количество `!important`, media queries и повторяющиеся селекторы. Сейчас CSS рабочий, но там много исторического веса; этот отчёт помогает чистить его постепенно.

## Что покрыто тестами

Сейчас backend-тесты проверяют:

- загрузку Spring context;
- включение/отключение забаненных пользователей в Spring Security;
- игровые правила streak, HP, shield и XP;
- безопасное удаление квестов;
- админское обновление статов;
- Telegram link code, привязку и защиту от чужого Telegram chat;
- Telegram callback-token, чтобы старую кнопку нельзя было переиспользовать;
- Telegram-цикл статуса daily plan item и запрет чужих/manual items.

Frontend пока проверяется через TypeScript/Vite build. Отдельного тест-раннера для React-компонентов здесь ещё нет.

## Частые проблемы

`Failed to configure a DataSource`

Проверь, что PostgreSQL запущен, база `flowvisior` создана, а `DB_PASSWORD` задан в том же терминале, из которого запускаешь backend.

`npm.ps1 cannot be loaded`

Это политика PowerShell. Используй:

```powershell
npm.cmd run build
```

или запускай команды из cmd/Git Bash.

`Permission denied: getsockopt` при Maven

Maven пытается скачать зависимости, а среда не даёт доступ в интернет. Запусти команду в обычном терминале с доступом к сети один раз; дальше зависимости будут лежать в локальном `.m2`.

Telegram polling стартует в тестах

Context-тест специально передаёт `telegram.bot.token=` и `telegram.polling.enabled=false`, чтобы тесты не ходили в Telegram API. Если добавляешь новые integration tests, не тащи туда реальный bot token без необходимости.

## Заметки для развития

Проект уже перерос стадию "форма + список задач". Следующие полезные шаги:

- постепенно уменьшить количество `!important` в CSS;
- добавить frontend-тесты хотя бы на API-клиент и пару критичных экранов;
- вынести auth-логику из контроллера в отдельный сервис;
- сделать отдельный test profile с изолированной БД, чтобы context-тесты не зависели от локального PostgreSQL;
- добавить Docker Compose для PostgreSQL и, возможно, для всего dev-окружения.
