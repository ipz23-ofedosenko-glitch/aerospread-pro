# 🌊 AeroSpread Pro

Програмне забезпечення оцінки розповсюдження забруднюючої аерозольної хмари в антропогенному середовищі на основі Гаусової моделі.

## 📋 Опис проекту

Дипломний проект для моделювання розповсюдження аерозольних забруднень в атмосфері з використанням класичної Гаусової моделі дисперсії.

### Основні можливості:
- ✅ Авторизація та управління користувачами
- ✅ База даних забруднюючих речовин
- ✅ Управління проектами моделювання
- 🔄 Моделювання розповсюдження хмари за Гаусовою моделлю
- 🗺️ Візуалізація на інтерактивній карті (OpenStreetMap)
- 🌤️ Інтеграція з OpenWeather API
- 📊 Генерація звітів (PDF/DOCX)

## 🛠️ Технології

- **Backend**: Node.js + Express
- **База даних**: PostgreSQL
- **Авторизація**: JWT (JSON Web Tokens)
- **API**: OpenWeather, OpenStreetMap
- **Frontend**: HTML, CSS, JavaScript (Vanilla)

## 📦 Встановлення

### Крок 1: Клонування репозиторію

```bash
git clone <your-repo-url>
cd aerospread-pro
```

### Крок 2: Встановлення залежностей

```bash
npm install
```

### Крок 3: Налаштування PostgreSQL

1. Встановіть PostgreSQL (якщо ще не встановлено):
   - Windows: https://www.postgresql.org/download/windows/
   - Linux: `sudo apt-get install postgresql postgresql-contrib`
   - macOS: `brew install postgresql`

2. Створіть базу даних:

```bash
# Увійдіть до PostgreSQL
sudo -u postgres psql

# Створіть базу даних
CREATE DATABASE aerospread_db;

# Створіть користувача (опціонально)
CREATE USER aerospread_user WITH PASSWORD 'your_password';

# Надайте права
GRANT ALL PRIVILEGES ON DATABASE aerospread_db TO aerospread_user;

# Вийдіть
\q
```

3. Виконайте SQL скрипти для створення таблиць:

```bash
# Створення схеми
psql -U postgres -d aerospread_db -f database/schema.sql

# Заповнення початковими даними
psql -U postgres -d aerospread_db -f database/seed_data.sql
```

### Крок 4: Налаштування змінних середовища

1. Скопіюйте файл `.env.example`:

```bash
cp .env.example .env
```

2. Відредагуйте `.env` файл та вкажіть ваші дані:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aerospread_db
DB_USER=postgres
DB_PASSWORD=ваш_пароль

JWT_SECRET=ваш_секретний_ключ_для_jwt

PORT=3000

OPENWEATHER_API_KEY=ваш_api_ключ_openweather

NODE_ENV=development
```

### Крок 5: Отримання API ключа OpenWeather

1. Зареєструйтесь на https://openweathermap.org/
2. Перейдіть до API keys
3. Скопіюйте ваш API ключ та вставте в `.env` файл

## 🚀 Запуск

### Режим розробки (з автоматичним перезапуском):

```bash
npm run dev
```

### Звичайний режим:

```bash
npm start
```

Сервер буде доступний за адресою: **http://localhost:3000**

## 📁 Структура проекту

```
aerospread-pro/
├── config/
│   └── database.js          # Підключення до PostgreSQL
├── database/
│   ├── schema.sql           # Схема бази даних
│   └── seed_data.sql        # Початкові дані
├── middleware/
│   └── auth.js              # JWT авторизація
├── routes/
│   ├── auth.js              # Маршрути авторизації
│   ├── projects.js          # Управління проектами
│   ├── substances.js        # Робота з речовинами
│   ├── weather.js           # OpenWeather API
│   ├── simulation.js        # Моделювання (в розробці)
│   └── reports.js           # Генерація звітів (в розробці)
├── public/                  # Статичні файли (HTML, CSS, JS)
│   ├── index.html
│   ├── dashboard.html
│   └── ...
├── .env                     # Змінні середовища (не в git)
├── .env.example             # Приклад змінних середовища
├── server.js                # Головний файл сервера
└── package.json
```

## 🔌 API Endpoints

### Авторизація
- `POST /api/auth/register` - Реєстрація
- `POST /api/auth/login` - Вхід
- `GET /api/auth/profile` - Профіль користувача
- `GET /api/auth/verify` - Перевірка токена

### Проекти
- `GET /api/projects` - Всі проекти користувача
- `POST /api/projects` - Створити проект
- `GET /api/projects/:id` - Отримати проект
- `PUT /api/projects/:id` - Оновити проект
- `DELETE /api/projects/:id` - Видалити проект

### Речовини
- `GET /api/substances` - Всі речовини
- `GET /api/substances/:id` - Конкретна речовина
- `GET /api/substances/search/:query` - Пошук речовин

### Погода
- `GET /api/weather/current?lat=50.45&lon=30.52` - Поточна погода
- `GET /api/weather/forecast?lat=50.45&lon=30.52` - Прогноз

### Моделювання (в розробці)
- `POST /api/simulation/calculate` - Розрахунок моделі

### Звіти (в розробці)
- `POST /api/reports/generate` - Генерація звіту

## 🧪 Тестування

Після запуску сервера:

1. Відкрийте http://localhost:3000
2. Зареєструйтесь як новий користувач
3. Увійдіть до системи
4. Перейдіть до dashboard

## 📝 Наступні кроки розробки

- [x] Налаштування бази даних
- [x] Авторизація користувачів
- [x] CRUD для проектів
- [x] Інтеграція OpenWeather
- [ ] Моделювання Гаусової хмари
- [ ] Інтеграція OpenStreetMap
- [ ] Візуалізація ізоліній
- [ ] Генерація PDF/Word звітів
- [ ] Оптимізація та тестування

## 👨‍💻 Автор

Дипломний проект з розробки програмного забезпечення для екологічного моделювання.

## 📄 Ліцензія

MIT
