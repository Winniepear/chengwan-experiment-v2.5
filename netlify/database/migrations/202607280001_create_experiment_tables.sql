CREATE TABLE IF NOT EXISTS participants (
    respondent_id TEXT PRIMARY KEY,
    wave_id TEXT NOT NULL,
    revision_id TEXT NOT NULL,
    base_material_id TEXT NOT NULL,
    material_id TEXT,
    condition_id TEXT,
    randomized INTEGER NOT NULL DEFAULT 0 CHECK (randomized IN (0,1)),
    consent INTEGER CHECK (consent IS NULL OR consent IN (0,1)),
    age INTEGER CHECK (age IS NULL OR age BETWEEN 0 AND 120),
    chinese_reading INTEGER CHECK (chinese_reading IS NULL OR chinese_reading IN (0,1)),
    social_media_experience INTEGER CHECK (social_media_experience IS NULL OR social_media_experience IN (0,1)),
    device TEXT,
    user_agent TEXT,
    current_step TEXT NOT NULL DEFAULT 'consent',
    stimulus_loaded_base INTEGER CHECK (stimulus_loaded_base IS NULL OR stimulus_loaded_base IN (0,1)),
    base_scroll_ok INTEGER CHECK (base_scroll_ok IS NULL OR base_scroll_ok IN (0,1)),
    base_time_sec INTEGER,
    stimulus_loaded INTEGER CHECK (stimulus_loaded IS NULL OR stimulus_loaded IN (0,1)),
    forced_view_ok INTEGER CHECK (forced_view_ok IS NULL OR forced_view_ok IN (0,1)),
    stimulus_time_sec INTEGER,
    complete_questionnaire INTEGER NOT NULL DEFAULT 0 CHECK (complete_questionnaire IN (0,1)),
    submitted INTEGER NOT NULL DEFAULT 0 CHECK (submitted IN (0,1)),
    exit_stage TEXT,
    duration_sec INTEGER,
    started_at TIMESTAMPTZ NOT NULL,
    randomized_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_seen_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS responses (
    id BIGSERIAL PRIMARY KEY,
    respondent_id TEXT NOT NULL REFERENCES participants(respondent_id) ON DELETE CASCADE,
    variable_name TEXT NOT NULL,
    value_text TEXT,
    value_num DOUBLE PRECISION,
    page_id TEXT NOT NULL,
    answered_at TIMESTAMPTZ NOT NULL,
    UNIQUE (respondent_id, variable_name)
);

CREATE TABLE IF NOT EXISTS events (
    id BIGSERIAL PRIMARY KEY,
    respondent_id TEXT NOT NULL REFERENCES participants(respondent_id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    page_id TEXT,
    payload_json TEXT,
    client_ts TEXT,
    server_ts TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_participants_condition
ON participants(wave_id, revision_id, condition_id);
CREATE INDEX IF NOT EXISTS idx_participants_step
ON participants(wave_id, revision_id, current_step);
CREATE INDEX IF NOT EXISTS idx_responses_respondent
ON responses(respondent_id);
CREATE INDEX IF NOT EXISTS idx_events_respondent
ON events(respondent_id);
