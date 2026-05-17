# Slack Integration (Incoming Webhooks)

## 1. Konfiguracja Slack Incoming Webhook

1. W Slack utwórz aplikację i aktywuj **Incoming Webhooks**.
2. Dodaj webhook do wybranego kanału.
3. Skopiuj URL webhooka (`https://hooks.slack.com/services/...`).

Dokumentacja:
- https://api.slack.com/messaging/webhooks
- https://api.slack.com/block-kit

## 2. Event types (`WebhookEventType`)

Obsługiwane typy:
- `stock_critical`
- `stock_low`
- `stock_digest`
- `contract_created`
- `contract_approved`
- `contract_cancelled`
- `contract_deadline`
- `prefabrication_completed`
- `brigade_task_assigned`
- `import_completed`
- `all` (wszystkie zdarzenia)

## 3. API konfiguracji webhooków

Endpoint bazowy: `/api/integrations/webhooks`

> Wszystkie endpointy wymagają `authenticate` + uprawnień admina.

### Lista
```bash
curl -X GET "https://your-host/api/integrations/webhooks" \
  -H "Authorization: Bearer <token>"
```

### Dodanie
```bash
curl -X POST "https://your-host/api/integrations/webhooks" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "slack",
    "webhookUrl": "https://hooks.slack.com/services/T000/B000/XXX",
    "eventType": "stock_critical",
    "channelName": "#alerts",
    "active": true
  }'
```

### Aktualizacja
```bash
curl -X PUT "https://your-host/api/integrations/webhooks/1" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "active": false }'
```

### Usunięcie
```bash
curl -X DELETE "https://your-host/api/integrations/webhooks/1" \
  -H "Authorization: Bearer <token>"
```

### Test webhooka
```bash
curl -X POST "https://your-host/api/integrations/webhooks/test" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "slack",
    "webhookUrl": "https://hooks.slack.com/services/T000/B000/XXX"
  }'
```

## 4. Block Kit format wiadomości

Wiadomości są wysyłane jako JSON z:
- `text` (fallback)
- `blocks` (Slack Block Kit)
- opcjonalnie `username` i `icon_emoji`

Przykład skróconego payloadu:

```json
{
  "text": "🚨 KRYTYCZNY BRAK: Kabel X",
  "username": "Grover Alert",
  "icon_emoji": ":rotating_light:",
  "blocks": [
    {
      "type": "header",
      "text": { "type": "plain_text", "text": "🚨 Krytyczny brak materiału", "emoji": true }
    },
    {
      "type": "section",
      "fields": [
        { "type": "mrkdwn", "text": "*Materiał:*\nKabel X" }
      ]
    }
  ]
}
```

## 5. Fallback ENV

Jeśli baza nie zwróci aktywnych konfiguracji webhooków (lub DB jest niedostępna), używany jest fallback:

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

Jeśli brak konfiguracji w DB i brak `SLACK_WEBHOOK_URL`, powiadomienie Slack jest pomijane bez błędu.
