# Wdrożenie Docker Compose

## Hasła i sekrety w pliku `.env`

Wartości sekretów zapisuj w pojedynczych cudzysłowach. Compose traktuje
wartości ujęte w pojedyncze cudzysłowy jako literały, dzięki czemu znaki `$`
nie są rozwijane jako zmienne. Przykład:

```env
DB_PASSWORD='silne-haslo-z-$-w-srodku'
REDIS_PASSWORD='inne-silne-haslo'
JWT_ACCESS_SECRET='co-najmniej-32-znaki'
JWT_REFRESH_SECRET='inny-sekret-minimum-32-znaki'
ENCRYPTION_KEY='losowy-klucz-szyfrujacy'
```

Wartości z `.env.example` są puste — ustaw własne sekrety przed uruchomieniem
Compose. Nie używaj tych przykładowych wartości w środowisku produkcyjnym.

## Publiczny HTTPS przez Nginx

Compose domyślnie udostępnia aplikację tylko na `127.0.0.1:3000`. To pozwala
na lokalny dostęp serwisowy, ale nie wystawia portu aplikacji publicznie.
Profil `https` uruchamia Nginx na portach 80 i 443, przekazuje ruch do
kontenera aplikacji i ustawia nagłówki reverse proxy. Używa certyfikatów
Let's Encrypt z hosta; backend pozostaje na HTTP wewnątrz sieci Compose.

Wymagane są publiczny DNS domeny skierowany na serwer oraz dostępne z Internetu
porty 80/443. W `.env` ustaw:

```env
DOMAIN=platforma.example.pl
CERTBOT_EMAIL=admin@example.pl
LETSENCRYPT_DIR=/etc/letsencrypt
CORS_ORIGIN=https://platforma.example.pl
FRONTEND_URL=https://platforma.example.pl
```

Pierwszy certyfikat uzyskaj w trybie standalone, gdy nic nie zajmuje portu 80.
Zastąp adres e-mail i domenę poniżej wartościami z `.env`:

```bash
docker compose --profile certbot run --rm --service-ports certbot certonly \
  --standalone --non-interactive --agree-tos \
  --email admin@example.pl -d platforma.example.pl
docker compose --profile https up --build -d
```

Certbot zapisuje certyfikaty w `LETSENCRYPT_DIR`; Nginx oczekuje plików
`live/$DOMAIN/fullchain.pem` i `live/$DOMAIN/privkey.pem`. Ponieważ certyfikat
został wystawiony przez standalone HTTP-01, odnawianie również wymaga
tymczasowego zwolnienia portu 80. Uruchom z crona hosta (np. raz dziennie):

```bash
docker compose --profile https stop proxy
if docker compose --profile certbot run --rm --service-ports certbot renew --standalone; then
  docker compose --profile https up -d proxy
else
  docker compose --profile https up -d proxy
  exit 1
fi
```

Proxy jest niedostępne przez czas odnowienia. Sprawdź konfigurację przed
produkcją: `docker compose --profile https stop proxy`, następnie
`docker compose --profile certbot run --rm --service-ports certbot renew --standalone --dry-run`
i na końcu uruchom proxy: `docker compose --profile https up -d proxy`.
Nie ustawiaj
`APP_BIND_ADDRESS=0.0.0.0` w publicznym wdrożeniu; ruch zewnętrzny powinien
przechodzić przez proxy.

## HTTPS w sieci lokalnej bez domeny

Jeśli serwer jest dostępny wyłącznie w sieci lokalnej, ustaw jego adres IP
lub nazwę hosta w `SERVER_HOST` i uruchom profil `https-lan`:

```env
SERVER_HOST=192.168.2.38
CORS_ORIGIN=https://192.168.2.38
FRONTEND_URL=https://192.168.2.38
```

```bash
docker compose --profile https-lan up --build -d
```

Proxy wygeneruje certyfikat self-signed z adresem `SERVER_HOST` w polu SAN
i zachowa go w wolumenie `lan_certs`. Certyfikat nie jest podpisany przez
publiczne centrum zaufania, dlatego aby usunąć ostrzeżenie przeglądarki,
zainstaluj go jako zaufany certyfikat na każdym urządzeniu w sieci:

```bash
docker compose --profile https-lan cp proxy-lan:/etc/nginx/certs/server.crt ./der-mag-lan.crt
```

Nie udostępniaj ani nie commituj prywatnego klucza `server.key`. Po zmianie
`SERVER_HOST` proxy automatycznie wygeneruje nowy certyfikat. Profile `https`
i `https-lan` korzystają z tych samych portów 80/443, więc nie uruchamiaj ich
jednocześnie. Przy zatrzymywaniu użyj `docker compose --profile https-lan down`;
wolumen certyfikatów pozostanie zachowany.

## Kopie zapasowe

Compose uruchamia usługę `backup` po migracjach. Tworzy ona jeden backup przy
starcie, a następnie codziennie o `BACKUP_TIME` UTC. Domyślna retencja wynosi
30 dni. Archiwa gzip trafiają do wolumenu `db_backups`; ustawienia można
zmienić przez `BACKUP_TIME` (`HH:MM`) i `BACKUP_RETENTION_DAYS` w `.env`.

Ręczne wykonanie i sprawdzenie plików:

```bash
docker compose run --rm backup bash /usr/local/bin/backup.sh once
docker compose run --rm --entrypoint bash backup -c \
  'ls -lh /backups && gzip -t /backups/grover_backup_*.sql.gz'
```

Kopia na tym samym serwerze i wolumenie nie chroni przed utratą hosta.
Regularnie kopiuj archiwa poza serwer (np. do zaszyfrowanego, kontrolowanego
repozytorium backupów) i okresowo testuj odtworzenie. Przykład kopiowania
najnowszego archiwum na hosta:

```bash
backup_file=$(docker compose exec -T backup bash -c \
  'ls -1t /backups/grover_backup_*.sql.gz | head -n 1')
mkdir -p ./offsite-staging
docker compose cp "backup:$backup_file" ./offsite-staging/
```

Odtworzenie jest destrukcyjne: zatrzymaj aplikację, wykonaj i zweryfikuj
osobną kopię aktualnej bazy, a następnie uruchom:

```bash
docker compose stop app
docker compose run --rm -it backup \
  bash /usr/local/bin/restore.sh /backups/grover_backup_YYYYMMDD_HHMMSS.sql.gz
docker compose up -d app
```

Skrypt wymaga wpisania `RESTORE`, usuwa bazę i tworzy ją ponownie z archiwum.
Po odtworzeniu sprawdź logowanie, zdrowie aplikacji i dane biznesowe.

Jeżeli uruchomiono profil HTTPS, dodaj `--profile https` do poleceń `down`,
aby zatrzymać także Nginx. `docker compose down` zachowuje wolumeny;
`docker compose --profile https down --volumes`
usuwa również bazę, Redis, uploady i archiwa backupów — nie używaj
tej opcji jako zwykłego sposobu zatrzymania usług.

## Diagnostyka

```bash
docker compose ps
docker compose logs --tail=100 app proxy backup
docker compose exec proxy nginx -t
```
