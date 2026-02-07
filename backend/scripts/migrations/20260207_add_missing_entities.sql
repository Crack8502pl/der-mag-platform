-- Migracja: Dodanie funkcjonalności zarządzania dokumentami, szablonów i importu CSV
-- Data: 2024-12-14
-- Opis: Tworzenie tabel dla dokumentów, szablonów dokumentów, importów materiałów oraz rozszerzenie bom_templates

-- Tabela dokumentów
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('uploaded', 'generated')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('invoice', 'protocol', 'report', 'bom_list', 'other')),
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    generated_from_template_id INTEGER REFERENCES document_templates(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela szablonów dokumentów
CREATE TABLE IF NOT EXISTS document_templates (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('word', 'excel', 'pdf')),
    file_path VARCHAR(500) NOT NULL,
    placeholders JSONB,
    task_type_id INTEGER REFERENCES task_types(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela importów materiałów
CREATE TABLE IF NOT EXISTS material_imports (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'preview', 'confirmed', 'completed', 'cancelled')),
    total_rows INTEGER DEFAULT 0,
    new_items INTEGER DEFAULT 0,
    existing_items INTEGER DEFAULT 0,
    error_items INTEGER DEFAULT 0,
    diff_preview JSONB,
    imported_ids JSONB,
    imported_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP
);

-- Rozszerzenie tabeli bom_templates
ALTER TABLE bom_templates 
ADD COLUMN IF NOT EXISTS uuid UUID UNIQUE DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS catalog_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS supplier VARCHAR(255),
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_documents_task_id ON documents(task_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);

CREATE INDEX IF NOT EXISTS idx_document_templates_task_type ON document_templates(task_type_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_active ON document_templates(active);

CREATE INDEX IF NOT EXISTS idx_material_imports_status ON material_imports(status);
CREATE INDEX IF NOT EXISTS idx_material_imports_imported_by ON material_imports(imported_by);

CREATE INDEX IF NOT EXISTS idx_bom_templates_catalog_number ON bom_templates(catalog_number);
CREATE INDEX IF NOT EXISTS idx_bom_templates_category ON bom_templates(category);

-- Komentarze do tabel
COMMENT ON TABLE documents IS 'Dokumenty związane z zadaniami (przesłane lub wygenerowane)';
COMMENT ON TABLE document_templates IS 'Szablony dokumentów do generowania dokumentów z placeholderami';
COMMENT ON TABLE material_imports IS 'Historia importów materiałów z plików CSV';

-- Komentarze do kolumn
COMMENT ON COLUMN documents.type IS 'Typ dokumentu: uploaded (przesłany) lub generated (wygenerowany)';
COMMENT ON COLUMN documents.category IS 'Kategoria: invoice, protocol, report, bom_list, other';
COMMENT ON COLUMN document_templates.placeholders IS 'JSON z polami do wypełnienia, np. {taskNumber}, {clientName}';
COMMENT ON COLUMN material_imports.diff_preview IS 'Podział importowanych danych na: new, existing, errors';
COMMENT ON COLUMN material_imports.imported_ids IS 'Tablica ID dodanych materiałów';
