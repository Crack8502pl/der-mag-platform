CREATE TABLE IF NOT EXISTS slican_central_specifications (
  id SERIAL PRIMARY KEY,
  warehouse_stock_id INTEGER NOT NULL UNIQUE REFERENCES warehouse_stock(id) ON DELETE CASCADE,
  model_name VARCHAR(50) NOT NULL,
  max_sip_voip_subscribers INTEGER NOT NULL CHECK (max_sip_voip_subscribers >= 0),
  max_dph_ip_devices INTEGER NOT NULL CHECK (max_dph_ip_devices >= 0),
  max_audio_ip_devices INTEGER NOT NULL CHECK (max_audio_ip_devices >= 0),
  max_ivr_channels INTEGER NOT NULL CHECK (max_ivr_channels >= 0),
  max_conference_channels INTEGER NOT NULL CHECK (max_conference_channels >= 0),
  max_all_accounts INTEGER,
  max_cts_phones_up0_ip INTEGER,
  max_concurrent_voice_calls INTEGER,
  max_concurrent_video_calls INTEGER,
  max_webcti_messengercti_accounts INTEGER,
  priority INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_slican_central_active ON slican_central_specifications(is_active);
CREATE INDEX IF NOT EXISTS idx_slican_central_priority ON slican_central_specifications(priority);

CREATE TABLE IF NOT EXISTS slican_voip_subscriber_formula (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  dph_ip_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0 CHECK (dph_ip_multiplier >= 0),
  audio_ip_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0 CHECK (audio_ip_multiplier >= 0),
  cts220_ip_multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0 CHECK (cts220_ip_multiplier >= 0),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS slican_license_specifications (
  id SERIAL PRIMARY KEY,
  warehouse_stock_id INTEGER NOT NULL UNIQUE REFERENCES warehouse_stock(id) ON DELETE CASCADE,
  license_type VARCHAR(50) NOT NULL CHECK (license_type IN ('VOIP_SUBSCRIBER', 'AUDIO', 'IVR', 'CONFERENCE')),
  package_size INTEGER NOT NULL CHECK (package_size IN (1, 10, 100)),
  demand_field VARCHAR(50) NOT NULL CHECK (demand_field IN ('sipVoipSubscribers', 'audioDevices', 'ivrChannels', 'conferenceChannels')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_slican_license_type ON slican_license_specifications(license_type);
CREATE INDEX IF NOT EXISTS idx_slican_license_active ON slican_license_specifications(is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_slican_license_unique
  ON slican_license_specifications(license_type, package_size) WHERE is_active = true;

-- Rollback (configuration only; warehouse_stock is untouched):
-- DROP TABLE IF EXISTS slican_license_specifications;
-- DROP TABLE IF EXISTS slican_voip_subscriber_formula;
-- DROP TABLE IF EXISTS slican_central_specifications;
