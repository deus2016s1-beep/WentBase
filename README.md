# WentBase MVP

Проект: настольная Windows-программа для учёта объектов вентиляции с общей облачной БД.

## 1) Структура проекта

Ниже — рекомендуемая структура репозитория под стек **Electron + React + TypeScript + Vite + Supabase + React Router + TanStack Query**.

```text
wentbase/
  package.json
  tsconfig.json
  .env.example
  electron-builder.json

  /electron
    main.ts                 # точка входа Electron main process
    preload.ts              # безопасный bridge (contextBridge)
    ipc/
      auth.ipc.ts           # IPC: сессия, logout
      app.ipc.ts            # IPC: app version, fs/save dialogs при необходимости
    services/
      supabaseClient.ts     # сервисный клиент (только если нужен в main)

  /src                      # React renderer (Vite)
    main.tsx
    app/
      App.tsx
      router.tsx            # React Router routes
      providers.tsx         # QueryClientProvider, AuthProvider
      layouts/
        AppLayout.tsx
      guards/
        RequireAuth.tsx
        RequireRole.tsx     # admin/viewer access guard

    /features
      auth/
        pages/LoginPage.tsx
        api/authApi.ts
        hooks/useAuth.ts

      objects/
        pages/ObjectsListPage.tsx
        pages/ObjectDetailsPage.tsx
        components/ObjectForm.tsx
        api/objectsApi.ts

      estimates/
        pages/EstimatesPage.tsx
        api/estimatesApi.ts

      client-payments/
        pages/ClientPaymentsPage.tsx
        api/clientPaymentsApi.ts

      object-expenses/
        pages/ObjectExpensesPage.tsx
        api/objectExpensesApi.ts

      cash-ledger/
        pages/CashLedgerPage.tsx
        api/cashLedgerApi.ts

      partners/
        pages/PartnersPage.tsx
        api/partnersApi.ts

      dashboard/
        pages/DashboardPage.tsx
        api/dashboardApi.ts

    /shared
      ui/
      lib/
        formatMoney.ts
        date.ts
        permissions.ts
      types/
        db.ts               # типы Supabase schema

  /supabase
    schema.sql              # таблицы + RLS + политики
    seed.sql                # стартовые роли и пользователи

  /docs
    mvp-plan.md
    screens.md
    risks.md
```

### Ключевые архитектурные принципы

- **Renderer (React)** работает с Supabase напрямую по `anon key` + RLS.
- **Electron main** не хранит чувствительные бизнес-данные; только shell/desktop-функции.
- **RBAC + RLS в Supabase** — главный механизм ограничения прав (`admin` vs `viewer`).
- **TanStack Query** — единый слой кеша/синхронизации данных для всех экранов.

---

## 2) Структура базы данных (Supabase/PostgreSQL)

Ниже минимальная схема для версии 1.

### 2.1 Справочники и доступ

1. `profiles`
   - `id uuid pk` (ссылается на `auth.users.id`)
   - `full_name text not null`
   - `role text not null check (role in ('admin','viewer'))`
   - `created_at timestamptz default now()`

2. `partners`
   - `id uuid pk`
   - `name text not null`
   - `phone text null`
   - `email text null`
   - `note text null`
   - `created_at timestamptz default now()`

### 2.2 Основной контур по объектам

3. `objects`
   - `id uuid pk`
   - `name text not null`
   - `address text null`
   - `status text not null default 'active'` (active/completed/on_hold)
   - `contract_amount numeric(14,2) not null default 0`
   - `start_date date null`
   - `end_date date null`
   - `responsible_partner_id uuid null -> partners.id`
   - `created_by uuid not null -> profiles.id`
   - `created_at timestamptz default now()`

4. `estimates` (КП/Смета)
   - `id uuid pk`
   - `object_id uuid not null -> objects.id on delete cascade`
   - `version_no int not null default 1`
   - `title text not null`
   - `amount numeric(14,2) not null default 0`
   - `is_active boolean not null default true`
   - `created_at timestamptz default now()`

5. `client_payments`
   - `id uuid pk`
   - `object_id uuid not null -> objects.id on delete cascade`
   - `payment_date date not null`
   - `amount numeric(14,2) not null check (amount > 0)`
   - `payment_method text null`
   - `comment text null`
   - `created_at timestamptz default now()`

6. `object_expenses`
   - `id uuid pk`
   - `object_id uuid not null -> objects.id on delete cascade`
   - `expense_date date not null`
   - `category text not null`
   - `amount numeric(14,2) not null check (amount > 0)`
   - `partner_id uuid null -> partners.id`
   - `comment text null`
   - `created_at timestamptz default now()`

### 2.3 Журнал движения денег и расчёт долей

7. `cash_ledger`
   - `id uuid pk`
   - `object_id uuid null -> objects.id`
   - `entry_date date not null`
   - `entry_type text not null` (client_in, expense_out, owner_withdrawal)
   - `direction text not null` (in/out)
   - `amount numeric(14,2) not null check (amount > 0)`
   - `owner text null check (owner in ('kamal','ruslan'))` (только для owner_withdrawal)
   - `source_table text null` (client_payments / object_expenses / manual)
   - `source_id uuid null`
   - `comment text null`
   - `created_at timestamptz default now()`

8. `profit_snapshots` (опционально для ускорения dashboard)
   - `id uuid pk`
   - `object_id uuid not null -> objects.id`
   - `calculated_at timestamptz not null default now()`
   - `total_income numeric(14,2) not null`
   - `total_expenses numeric(14,2) not null`
   - `profit numeric(14,2) not null`
   - `kamal_share numeric(14,2) not null`
   - `ruslan_share numeric(14,2) not null`
   - `ruslan_withdrawn numeric(14,2) not null`
   - `ruslan_debt numeric(14,2) not null`

### 2.4 Финансовые формулы (бизнес-правила)

Для каждого объекта:

- `income = sum(client_payments.amount)`
- `expenses = sum(object_expenses.amount)`
- `profit = income - expenses`
- `kamal_share = profit * 0.5`
- `ruslan_share = profit * 0.5`
- `ruslan_withdrawn = sum(cash_ledger.amount where entry_type='owner_withdrawal' and owner='ruslan')`
- `ruslan_debt = greatest(ruslan_withdrawn - ruslan_share, 0)`

> Важно: при отрицательной прибыли доли можно показывать как 0 до выхода в плюс (решение фиксируется бизнес-правилом в ТЗ).

### 2.5 RLS-политики (минимум)

- `admin` (Камал): `select/insert/update/delete` на бизнес-таблицы.
- `viewer` (Руслан): только `select` на бизнес-таблицы.
- Обязательно запретить `insert/update/delete` для `viewer` на уровне SQL policy.
- Профили создаются триггером после регистрации пользователя.

---

## 3) Описание экранов MVP

1. **Авторизация**
   - Вход по email/password.
   - После входа загружается профиль и роль.
   - Если роль `viewer`, UI в режиме read-only (без кнопок изменения).

2. **Объекты (список)**
   - Таблица: название, адрес, статус, сумма договора, поступления, расходы, прибыль.
   - Поиск/фильтр по статусу.
   - Для `admin`: создание и редактирование объекта.

3. **Карточка объекта**
   - Блоки: общая информация, договор, KPI по финансам.
   - Вкладки: КП/Смета, Платежи, Расходы, Движение денег.
   - Для `viewer`: только просмотр всех блоков.

4. **КП / Смета**
   - Список версий сметы по объекту.
   - Просмотр активной сметы и итоговой суммы.
   - Для `admin`: создать/обновить версию.

5. **Платежи клиентов**
   - Журнал входящих платежей по объекту.
   - Для `admin`: добавить/изменить/удалить платеж.

6. **Расходы по объекту**
   - Журнал расходов с категорией и контрагентом.
   - Для `admin`: CRUD.

7. **Журнал движения денег**
   - Единая хронология: входящие, исходящие, выводы собственников.
   - Отдельный фильтр по `owner = kamal/ruslan`.
   - Показатель задолженности Руслана.

8. **Партнёры**
   - Справочник контрагентов/партнёров.
   - Для `admin`: CRUD.
   - Для `viewer`: только список и просмотр.

9. **Dashboard**
   - KPI по всем объектам: общий доход, расход, прибыль.
   - Доля Камала, доля Руслана, фактически выведено Русланом, долг Руслана.
   - Топ объектов по прибыли и проблемные (убыточные/с долгом).

---

## 4) План разработки по этапам

### Этап 0 — Подготовка

- Инициализация Electron + Vite + React + TypeScript.
- Подключение React Router, TanStack Query.
- Подготовка `.env`, клиент Supabase.
- Базовый layout, навигация, guard-компоненты.

### Этап 1 — БД и безопасность

- Создание схемы Supabase (таблицы, индексы, FK).
- Включение RLS на всех таблицах.
- Политики `admin/viewer`.
- Seed-пользователи:
  - Камал -> `admin`
  - Руслан -> `viewer`

### Этап 2 — Авторизация

- Экран логина.
- Получение роли из `profiles`.
- Route guards и скрытие кнопок по роли.

### Этап 3 — Объекты + карточка

- Список объектов, фильтры, переход в карточку.
- CRUD объекта для admin.
- Финансовые агрегаты на карточке (через SQL view/RPC).

### Этап 4 — Финансовые модули

- КП/Смета.
- Платежи клиентов.
- Расходы.
- Автозапись в `cash_ledger` при добавлении платежей/расходов (через trigger).

### Этап 5 — Движение денег + расчёт прибыли/долга

- Экран `cash_ledger`.
- Операции вывода доли собственников.
- Расчёт `ruslan_debt` и виджет предупреждения.

### Этап 6 — Партнёры + Dashboard

- CRUD партнёров.
- Dashboard c KPI и сводной аналитикой.

### Этап 7 — Стабилизация и релиз MVP

- Тестирование ролей и RLS.
- Обработка ошибок/пустых состояний.
- Сборка Windows-инсталлятора (`electron-builder`).
- Резервное копирование БД и регламент восстановления.

---

## 5) Риски и слабые места архитектуры

1. **Сложность RLS/ролей**
   - Ошибки политик могут случайно дать `viewer` право записи.
   - Нужны SQL-тесты на права доступа.

2. **Дублирование финансовых данных**
   - Если хранить и агрегаты, и первичку — риск расхождения.
   - Приоритет: “single source of truth” (первичные транзакции) + вычисляемые view.

3. **Конкурентное редактирование**
   - Два ПК могут менять один объект одновременно.
   - Нужен `updated_at` + optimistic locking для критичных форм.

4. **Зависимость от интернета/облака**
   - При недоступности Supabase приложение частично неработоспособно.
   - Требуется UX на offline/error-сценарии и уведомления.

5. **Финансовая трактовка прибыли**
   - Возможны споры: считать по оплатам, по договору, по актам.
   - Нужно зафиксировать формулы в ТЗ и в интерфейсе “как считается”.

6. **Безопасность ключей и сессий в desktop**
   - Нельзя хранить service role key в renderer.
   - Использовать только `anon key`, RLS и минимальный surface IPC.

7. **Масштабирование отчётов**
   - С ростом данных dashboard-запросы могут стать тяжёлыми.
   - Нужны индексы, materialized views или snapshots.

---

## Предлагаемый следующий шаг

После утверждения этой структуры — перейти к **Этапу 0–1**: поднять каркас проекта и SQL-миграцию Supabase (без полной реализации всех экранов).
