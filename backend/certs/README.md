# SSL Certificates

Ten folder zawiera certyfikaty SSL dla lokalnego developmentu z HTTPS.

## Generowanie certyfikatów

### Linux/Mac:
```bash
cd backend
./scripts/generate-certs.sh 192.168.2.38
```

### Windows:
```powershell
cd backend
.\scripts\generate-certs.ps1 -IpAddress 192.168.2.38
```

## Zmiana adresu IP

Gdy przenosisz aplikację na inną maszynę z innym IP:

1. Wygeneruj nowe certyfikaty z nowym IP:
   ```bash
   ./scripts/generate-certs.sh <NOWY_IP>
   ```

2. Zaktualizuj zmienną środowiskową (opcjonalnie):
   ```bash
   # W pliku .env
   SERVER_HOST=<NOWY_IP>
   ```

3. Zrestartuj backend i frontend

## Akceptacja certyfikatu w przeglądarce

Po pierwszym uruchomieniu:
1. Otwórz `https://192.168.2.38:3000/health`
2. Kliknij "Advanced" → "Proceed to... (unsafe)"
3. Otwórz `https://192.168.2.38:5173`
4. Powtórz akceptację certyfikatu

## Certyfikaty dla produkcji

⚠️ **UWAGA**: Te certyfikaty są self-signed i przeznaczone TYLKO dla developmentu!

Dla produkcji użyj certyfikatów od Let's Encrypt lub innego CA.
