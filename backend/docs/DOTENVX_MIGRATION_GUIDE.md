# Migracja z dotenv-vault na @dotenvx/dotenvx

## Dlaczego migrujemy?

dotenv-vault zawiera podatną wersję axios (<=0.30.2) z następującymi CVE:
- GHSA-wf5p-g6vw-rhxx (CSRF)
- GHSA-jr5f-v2jv-69x6 (SSRF)
- GHSA-43fc-jf86-j433 (DoS)

@dotenvx/dotenvx to oficjalny następca od tego samego autora (Mot).

## Kluczowe różnice

| Operacja | dotenv-vault (stare) | @dotenvx/dotenvx (nowe) |
|----------|---------------------|------------------------|
| Szyfrowanie | `npm run env:build` | `npm run env:encrypt` |
| Deszyfrowanie | `npm run env:pull` | `npm run env:decrypt` |
| Uruchomienie | `npm run dev` | `npm run dev` (bez zmian) |
| Dodanie secret | `npm run env:push` | `npm run env:set KEY=value` |

## Instalacja

### 1. Usuń stary pakiet
```bash
npm uninstall dotenv-vault
```

### 2. Zainstaluj nowy
```bash
npm install @dotenvx/dotenvx --save-dev
```

### 3. Zainicjuj dotenvx (opcjonalne - jeśli zaczynasz od nowa)
```bash
npx dotenvx encrypt
```

## Migracja istniejących secrets

### Jeśli masz .env.vault z dotenv-vault:

Dobra wiadomość! @dotenvx/dotenvx jest **wstecznie kompatybilny** i może odczytywać stare pliki .env.vault.

```bash
# Deszyfruj stare secrets
DOTENV_PRIVATE_KEY="your-key" npx dotenvx decrypt

# Zaszyfruj ponownie z nowym formatem
npx dotenvx encrypt
```

### Nowe zmienne środowiskowe:

Zamiast `DOTENV_VAULT_DEVELOPMENT_KEY` użyj:
- `DOTENV_PRIVATE_KEY` - uniwersalny klucz deszyfrujący
- `DOTENV_PRIVATE_KEY_PRODUCTION` - klucz dla produkcji
- `DOTENV_PRIVATE_KEY_CI` - klucz dla CI/CD

## Codzienna praca

### Uruchomienie aplikacji (auto-decrypt):
```bash
npm run dev
# lub bezpośrednio:
npx dotenvx run -- npm run start
```

### Dodawanie nowych secrets:
```bash
# Dodaj do .env
echo "NEW_SECRET=value" > .env

# Zaszyfruj
npm run env:encrypt

# Commit
git add .env.vault
git commit -m "feat: add NEW_SECRET"
```

### Sprawdzenie wartości:
```bash
npm run env:get DB_HOST
# lub wszystkie:
npm run env:get
```

## Konfiguracja CI/CD

### GitHub Actions:
```yaml
env:
  DOTENV_PRIVATE_KEY: ${{ secrets.DOTENV_PRIVATE_KEY }}

steps:
  - run: npx dotenvx run -- npm test
```

### Docker:
```dockerfile
ENV DOTENV_PRIVATE_KEY=${DOTENV_PRIVATE_KEY}
CMD ["npx", "dotenvx", "run", "--", "node", "dist/index.js"]
```

## Bezpieczeństwo

### Pliki do .gitignore (już powinny tam być):
```
.env
.env.keys
.env.local
.env.*.local
```

### Pliki BEZPIECZNE do commitowania:
```
.env.vault      # zaszyfrowane secrets
.env.example    # template bez wartości
```

## Troubleshooting

### "Missing private key"
```bash
# Sprawdź czy masz klucz w .env.keys
cat .env.keys

# Lub ustaw zmienną środowiskową
export DOTENV_PRIVATE_KEY="your-key-here"
```

### "Cannot decrypt"
```bash
# Upewnij się że używasz właściwego klucza dla środowiska
DOTENV_PRIVATE_KEY_PRODUCTION="key" npx dotenvx decrypt
```

## Dokumentacja

- Oficjalna strona: https://dotenvx.com
- GitHub: https://github.com/dotenvx/dotenvx
- Porównanie z dotenv-vault: https://dotenvx.com/docs/quickstart
