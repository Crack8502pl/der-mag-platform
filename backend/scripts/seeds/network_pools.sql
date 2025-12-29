-- scripts/seeds/network_pools.sql
-- Seed data: Pule adresów IP

INSERT INTO network_pools (name, cidr_range, priority, is_active, description, created_at)
VALUES 
  (
    'Primary Pool - 172.16.0.0/12',
    '172.16.0.0/12',
    1,
    true,
    'Główna pula adresów IP dla projektów. Zakres: 172.16.0.0 - 172.31.255.255 (1,048,576 adresów)',
    NOW()
  ),
  (
    'Backup Pool - 192.168.0.0/16',
    '192.168.0.0/16',
    2,
    true,
    'Zapasowa pula adresów IP. Zakres: 192.168.0.0 - 192.168.255.255 (65,536 adresów)',
    NOW()
  ),
  (
    'Special Pool - 10.0.0.0/8',
    '10.0.0.0/8',
    3,
    true,
    'Pula dla specjalnych projektów i testów. Zakres: 10.0.0.0 - 10.255.255.255 (16,777,216 adresów)',
    NOW()
  )
ON CONFLICT DO NOTHING;

-- Komentarze
COMMENT ON TABLE network_pools IS 'Pule adresów IP dla alokacji w podsystemach';
