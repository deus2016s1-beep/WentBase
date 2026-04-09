# Supabase schema notes (MVP)

## Какие таблицы хранить как сущности

Отдельные сущности (храним как таблицы):

- `profiles` — пользователи и их роли.
- `projects` — карточки объектов.
- `project_estimates` — версии смет.
- `client_payments` — входящие платежи от клиентов.
- `project_expenses` — фактические расходы по объектам.
- `cash_journal` — единый журнал движения денег, включая вывод долей.

## Что считать запросами (не хранить отдельной таблицей в MVP)

Рекомендуется считать динамически SQL-запросами (view/RPC):

- `project_income = sum(client_payments.amount) by project_id`
- `project_expense_total = sum(project_expenses.amount) by project_id`
- `project_profit = project_income - project_expense_total`
- `kamal_share = project_profit * 0.5`
- `ruslan_share = project_profit * 0.5`
- `ruslan_withdrawn = sum(cash_journal.amount where entry_type='owner_withdrawal' and owner='ruslan')`
- `ruslan_debt = greatest(ruslan_withdrawn - ruslan_share, 0)`

Так мы избегаем расхождения данных между первичными транзакциями и агрегатами.

Если отчёты станут тяжёлыми, можно добавить materialized view/таблицу snapshot на следующем этапе.
