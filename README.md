# openclaw-plugin-discipline

OpenClaw plugin: paste-bomb guard через `message_sending` hook.

L2-B уровень дисциплины OpenClaw per [ADR #31](https://github.com/kgerman-org/kgerman-infra/blob/main/Архитектура/Архитектура%20—%20ИИ-агенты.md), эпик [kgerman-org/kgerman-infra#318](https://github.com/kgerman-org/kgerman-infra/issues/318), задача [#319](https://github.com/kgerman-org/kgerman-infra/issues/319).

## Что делает

Перехватывает каждое исходящее сообщение из OpenClaw в любой channel (Telegram, Slack, и т.д.) и применяет правила:

- **Длина > 2000 символов** → `cancel: true`. Reason: «outbound > 2000; пишите короткое summary + file path / Issue URL».
- **Pattern match** (PDF dump `^%PDF-`, page marker `==== PAGE N ====`, ≥3 markdown table rows, ≥3 CSV-row-id lines) → `cancel: true`. Reason: классификация pattern.
- **Borderline 1500..2000 chars + слабый match** (1 md table row, 1 page marker) → `rewrite` с truncate до 1000 chars + маркер `[...trimmed N chars]`.
- **Иначе** → pass through.

Каждое срабатывание записывается одной строкой JSONL в `/var/log/openclaw/discipline-blocks.jsonl`. Raw content **не** логируется (per [ADR #33](https://github.com/kgerman-org/kgerman-infra/blob/main/Архитектура/Архитектура%20—%20ИИ-агенты.md)) — только metadata: timestamp, layer, agent_id, tool_or_action, reason, content_total_length, severity.

## Установка

На VPS Уфа и Запад под `openclaw` user:

```bash
sudo -u openclaw openclaw plugins install git:github.com/kgerman-org/openclaw-plugin-discipline@main
sudo -u openclaw openclaw gateway restart
sudo -u openclaw openclaw plugins inspect openclaw-discipline --runtime --json
```

## Конфигурация (опционально)

В `/home/openclaw/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "entries": {
      "openclaw-discipline": {
        "config": {
          "lengthCapHard": 2000,
          "lengthCapBorderline": 1500,
          "truncateTo": 1000,
          "logPath": "/var/log/openclaw/discipline-blocks.jsonl"
        }
      }
    }
  }
}
```

Все поля опциональны — defaults выше встроены в плагин.

## Acceptance smoke

После deploy — проверка из Telegram-DM с агентом:

1. Длинное сообщение — попросить агента прислать любой текст > 2000 chars. Ожидаем cancel + строка в `/var/log/openclaw/discipline-blocks.jsonl` с `reason="outbound > 2000..."`, `severity="hard-deny"`.
2. PDF dump — попросить агента прислать содержимое file начинающегося с `%PDF-`. Ожидаем cancel с `reason="pdf-dump..."`.
3. CSV rows — попросить прислать ≥3 строки реестра S-retail-014, S-retail-015, S-retail-016. Ожидаем cancel с `reason="csv-rows..."`.
4. Короткое прохождение — обычное сообщение «Готово» — ожидаем pass без записи в лог.

## Tests

```bash
npm install
npm run test
npm run typecheck
```

## Лицензия

Internal — kgerman-org private repo.
