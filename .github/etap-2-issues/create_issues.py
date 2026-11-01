#!/usr/bin/env python3
"""Zakłada w GitHubie epik Etapu 2, 28 sub-issues i zależności "blocked by".

Uruchamianie:
  - z GitHuba: Actions -> "Etap 2: załóż zgłoszenia" -> Run workflow,
  - lokalnie:  GITHUB_TOKEN=... GITHUB_REPOSITORY=wlasciciel/repo python3 create_issues.py

Zmienne:
  GITHUB_TOKEN        token z uprawnieniem Issues: write
  GITHUB_REPOSITORY   np. Crack8502pl/der-mag-platform
  DRY_RUN             "true" = nic nie zmienia, tylko pokazuje plan i zapisuje
                      gotowe treści do katalogu rendered/ (domyślnie "true")
  GITHUB_API_URL      opcjonalnie (domyślnie https://api.github.com)

Skrypt można uruchamiać wielokrotnie: zgłoszenia, które już istnieją (ten sam
klucz na początku tytułu), nie są zakładane drugi raz ani nadpisywane.
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
API = os.environ.get('GITHUB_API_URL', 'https://api.github.com').rstrip('/')
REPO = os.environ.get('GITHUB_REPOSITORY', '')
TOKEN = os.environ.get('GITHUB_TOKEN', '')
DRY_RUN = os.environ.get('DRY_RUN', 'true').strip().lower() not in ('false', '0', 'no', 'nie')
PAUSE = float(os.environ.get('PAUSE_SECONDS', '1'))  # chroni przed limitem tworzenia treści


class ApiError(Exception):
    def __init__(self, status, body):
        super().__init__(f'HTTP {status}: {body[:300]}')
        self.status = status


def call(method, path, data=None):
    url = API + path
    req = urllib.request.Request(url, method=method)
    req.add_header('Accept', 'application/vnd.github+json')
    req.add_header('X-GitHub-Api-Version', '2022-11-28')
    req.add_header('Authorization', f'Bearer {TOKEN}')
    body = None
    if data is not None:
        body = json.dumps(data).encode('utf-8')
        req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req, body, timeout=30) as resp:
            raw = resp.read().decode('utf-8')
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as err:
        raise ApiError(err.code, err.read().decode('utf-8', 'replace'))


def paged(path):
    page = 1
    while True:
        sep = '&' if '?' in path else '?'
        chunk = call('GET', f'{path}{sep}per_page=100&page={page}')
        if not chunk:
            return
        yield from chunk
        if len(chunk) < 100:
            return
        page += 1


def issue_key(title):
    if title.startswith('[EPIK]'):
        return 'EPIK'
    m = re.match(r'^(V-END|[WV]\d+[a-c]?):', title)
    return m.group(1) if m else None


def render(text, numbers):
    def sub(m):
        key = m.group(1)
        return f'#{numbers[key]}' if key in numbers else f'({key})'
    return re.sub(r'\{\{#([A-Za-z0-9-]+)\}\}', sub, text)


def log(msg):
    print(msg, flush=True)


def main():
    manifest = json.load(open(os.path.join(HERE, 'manifest.json'), encoding='utf-8'))
    entries = [manifest['epic']] + manifest['issues']

    if not REPO or '/' not in REPO:
        sys.exit('Brak GITHUB_REPOSITORY (np. wlasciciel/repo).')
    if not DRY_RUN and not TOKEN:
        sys.exit('Brak GITHUB_TOKEN.')
    base = f'/repos/{REPO}'
    log(f'Repozytorium: {REPO} · tryb: {"PRÓBA (nic nie zmieniam)" if DRY_RUN else "ZAKŁADANIE"}')

    # ---------------------------------------------------------- stan obecny
    existing = {}
    if TOKEN:
        try:
            for it in paged(f'{base}/issues?state=all&labels=etap-2'):
                if 'pull_request' in it:
                    continue
                key = issue_key(it['title'])
                if key and key not in existing:
                    existing[key] = it
            log(f'Istniejące zgłoszenia Etapu 2: {len(existing)}')
        except ApiError as err:
            if not DRY_RUN:
                sys.exit(f'Nie mogę odczytać zgłoszeń z {REPO}: {err}')
            log(f'(próba) nie mogę odczytać repozytorium ({err.status}) - pokazuję plan dla pustego repo')

    # ---------------------------------------------------------- etykiety i milestone
    milestone_number = None
    if DRY_RUN:
        log(f'[próba] etykiety: {", ".join(manifest["labels"])}')
        log(f'[próba] milestone: {manifest["milestone"]}')
    else:
        for name, (color, desc) in manifest['labels'].items():
            try:
                call('POST', f'{base}/labels', {'name': name, 'color': color, 'description': desc})
                log(f'+ etykieta {name}')
            except ApiError as err:
                if err.status != 422:  # 422 = już istnieje
                    raise
        for ms in paged(f'{base}/milestones?state=all'):
            if ms['title'] == manifest['milestone']:
                milestone_number = ms['number']
        if milestone_number is None:
            ms = call('POST', f'{base}/milestones', {
                'title': manifest['milestone'],
                'description': 'Etap 2: kreator workflow, automatyzacje i audyt'})
            milestone_number = ms['number']
            log(f'+ milestone {manifest["milestone"]}')

    # ---------------------------------------------------------- zgłoszenia
    numbers, ids = {}, {}
    fake = 9000
    rendered_dir = os.path.join(HERE, 'rendered')
    if DRY_RUN:
        os.makedirs(rendered_dir, exist_ok=True)

    for entry in entries:
        key = entry['key']
        if key in existing:
            numbers[key] = existing[key]['number']
            ids[key] = existing[key]['id']
            log(f'= {key}: już istnieje jako #{numbers[key]}, pomijam')
            continue
        body = render(open(os.path.join(HERE, entry['file']), encoding='utf-8').read(), numbers)
        if DRY_RUN:
            fake += 1
            numbers[key], ids[key] = fake, fake
            open(os.path.join(rendered_dir, entry['file']), 'w', encoding='utf-8').write(
                f'# {entry["title"]}\n\nEtykiety: {", ".join(entry["labels"])}\n\n{body}')
            log(f'[próba] #{fake} {entry["title"]}')
            continue
        payload = {'title': entry['title'], 'body': body, 'labels': entry['labels']}
        if milestone_number:
            payload['milestone'] = milestone_number
        created = call('POST', f'{base}/issues', payload)
        numbers[key], ids[key] = created['number'], created['id']
        log(f'+ #{created["number"]} {entry["title"]}')
        time.sleep(PAUSE)

    # ---------------------------------------------------------- sub-issues i zależności
    warnings = []
    epic_no = numbers['EPIK']
    for entry in manifest['issues']:
        key = entry['key']
        if DRY_RUN:
            deps = ', '.join(entry['blocked_by']) or '-'
            log(f'[próba] {key} -> sub-issue epiku #{epic_no}; zablokowane przez: {deps}')
            continue
        try:
            call('POST', f'{base}/issues/{epic_no}/sub_issues', {'sub_issue_id': ids[key]})
            log(f'  {key}: dodane do epiku')
        except ApiError as err:
            if err.status == 422:
                log(f'  {key}: już jest w epiku')
            else:
                warnings.append(f'{key}: nie udało się dodać do epiku ({err})')
        for blocker in entry['blocked_by']:
            try:
                call('POST', f'{base}/issues/{numbers[key]}/dependencies/blocked_by',
                     {'issue_id': ids[blocker]})
                log(f'  {key}: zablokowane przez {blocker}')
            except ApiError as err:
                if err.status == 422:
                    log(f'  {key}: zależność od {blocker} już istnieje')
                else:
                    warnings.append(f'{key} <- {blocker}: nie udało się ustawić zależności ({err}). '
                                    f'Ustaw ręcznie w panelu Relationships.')
        time.sleep(PAUSE / 2)

    log('')
    log('Gotowe.' if not warnings else 'Gotowe, z uwagami:')
    for w in warnings:
        log(f'! {w}')
    if DRY_RUN:
        log(f'Podgląd treści: {rendered_dir}')
        log('Aby naprawdę założyć zgłoszenia, uruchom ponownie z DRY_RUN=false.')
    else:
        log(f'Epik: https://github.com/{REPO}/issues/{epic_no}')


if __name__ == '__main__':
    main()
