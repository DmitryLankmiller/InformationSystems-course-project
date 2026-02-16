CREATE TABLE IF NOT EXISTS app_user (
    id SERIAL PRIMARY KEY,
    login TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    last_login TIMESTAMP
);

CREATE TABLE IF NOT EXISTS project (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT
);

CREATE TYPE role_enum AS ENUM ('project_owner', 'editor', 'guest');

CREATE TABLE IF NOT EXISTS user_per_project (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES app_user ON DELETE CASCADE,
    project_id INTEGER NOT NULL REFERENCES project ON DELETE CASCADE,
    user_role role_enum NOT NULL
);

CREATE TYPE search_type_enum AS ENUM ('by_links', 'by_text');

CREATE TYPE sort_type_enum AS ENUM (
    'date_asc',
    'date_desc',
    'rating_asc',
    'rating_desc'
);

CREATE TYPE status_enum AS ENUM ('init', 'collecting_links', 'links_collected', 'in_progress', 'paused', 'error', 'parsing_done', 'creating_report', 'done');

CREATE TABLE IF NOT EXISTS parsing_job (
    id SERIAL PRIMARY KEY,
    user_creator_id INTEGER NOT NULL REFERENCES app_user,
    project_id INTEGER NOT NULL REFERENCES project ON DELETE CASCADE,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    website TEXT NOT NULL DEFAULT 'wildberries',
    search_type search_type_enum NOT NULL,
    feedbacks_per_item_limit INTEGER CHECK (feedbacks_per_item_limit > 0),
    feedbacks_sort_type sort_type_enum NOT NULL,
    status status_enum NOT NULL DEFAULT 'init',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS search_by_text (
    id SERIAL PRIMARY KEY,
    parsing_job_id INTEGER NOT NULL REFERENCES parsing_job ON DELETE CASCADE,
    search_input TEXT NOT NULL,
    items_limit INTEGER CHECK (items_limit > 0),
    items_sort_type sort_type_enum NOT NULL,
    links_collected boolean NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS parsing_link (
    id SERIAL PRIMARY KEY,
    parsing_job_id INTEGER NOT NULL REFERENCES parsing_job ON DELETE CASCADE,
    url TEXT NOT NULL,
    is_parsed boolean NOT NULL DEFAULT FALSE,
    last_updated TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TYPE feedback_state_enum AS ENUM ('purchased', 'returned', 'canceled', 'pinned');

CREATE TABLE IF NOT EXISTS feedback_object (
    id SERIAL PRIMARY KEY,
    parsing_job_id INTEGER NOT NULL REFERENCES parsing_job ON DELETE CASCADE,
    s3_key TEXT NOT NULL UNIQUE,
    checksum TEXT NOT NULL,
    stars_rating smallint NOT NULL CHECK (
        stars_rating >= 1
        and stars_rating <= 5
    ),
    feedback_state feedback_state_enum NOT NULL,
    feedback_date TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS statistical_report (
    id SERIAL PRIMARY KEY,
    parsing_job_id INTEGER NOT NULL REFERENCES parsing_job ON DELETE CASCADE,
    feedbacks_count INTEGER NOT NULL CHECK (feedbacks_count > 0)
);

CREATE TABLE IF NOT EXISTS ai_report (
    id SERIAL PRIMARY KEY,
    parsing_job_id INTEGER NOT NULL REFERENCES parsing_job ON DELETE CASCADE,
    ai_answer TEXT NOT NULL,
    duration_s INTEGER NOT NULL CHECK (duration_s > 0),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS card_object (
    id SERIAL PRIMARY KEY,
    parsing_job_id INTEGER NOT NULL REFERENCES parsing_job ON DELETE CASCADE,
    s3_key TEXT NOT NULL UNIQUE,
    checksum TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS liked_cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES app_user ON DELETE CASCADE,
    card_object_id INTEGER NOT NULL REFERENCES card_object ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stars_count (
    id SERIAL PRIMARY KEY,
    statistical_report_id INTEGER NOT NULL REFERENCES statistical_report ON DELETE CASCADE,
    star_1_count INTEGER NOT NULL CHECK (star_1_count >= 0),
    star_2_count INTEGER NOT NULL CHECK (star_2_count >= 0),
    star_3_count INTEGER NOT NULL CHECK (star_3_count >= 0),
    star_4_count INTEGER NOT NULL CHECK (star_4_count >= 0),
    star_5_count INTEGER NOT NULL CHECK (star_5_count >= 0)
);

CREATE TABLE IF NOT EXISTS feedback_states_count (
    id SERIAL PRIMARY KEY,
    statistical_report_id INTEGER NOT NULL REFERENCES statistical_report ON DELETE CASCADE,
    purchased_count INTEGER NOT NULL CHECK (purchased_count >= 0),
    returned_count INTEGER NOT NULL CHECK (returned_count >= 0),
    canceled_count INTEGER NOT NULL CHECK (canceled_count >= 0)
);

CREATE TABLE IF NOT EXISTS top_5_words (
    id SERIAL PRIMARY KEY,
    statistical_report_id INTEGER NOT NULL REFERENCES statistical_report ON DELETE CASCADE,
    word_1 TEXT NOT NULL,
    word_1_count INTEGER NOT NULL CHECK (word_1_count > 0),
    word_2 TEXT NOT NULL,
    word_2_count INTEGER NOT NULL CHECK (word_2_count > 0),
    word_3 TEXT NOT NULL,
    word_3_count INTEGER NOT NULL CHECK (word_3_count > 0),
    word_4 TEXT NOT NULL,
    word_4_count INTEGER NOT NULL CHECK (word_4_count > 0),
    word_5 TEXT NOT NULL,
    word_5_count INTEGER NOT NULL CHECK (word_5_count > 0)
);

CREATE OR REPLACE FUNCTION set_updated_columns()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_update_set_updated_columns
BEFORE UPDATE ON parsing_job
FOR EACH ROW EXECUTE PROCEDURE set_updated_columns();

CREATE TRIGGER on_update_set_updated_columns
BEFORE UPDATE ON parsing_link
FOR EACH ROW EXECUTE PROCEDURE set_updated_columns();

CREATE TABLE IF NOT EXISTS status_model (
    from_status status_enum NOT NULL,
    to_status status_enum NOT NULL,
    PRIMARY KEY (from_status, to_status)
);

INSERT INTO status_model (from_status, to_status) VALUES
('init', 'collecting_links'),
('init', 'in_progress'),
('collecting_links', 'links_collected'),
('links_collected', 'in_progress'),
('in_progress', 'parsing_done'),
('in_progress', 'paused'),
('in_progress', 'error'),
('paused', 'in_progress'),
('paused', 'init'),
('error', 'paused'),
('error', 'init'),
('parsing_done', 'creating_report'),
('creating_report', 'done'),
('done', 'init');

CREATE OR REPLACE FUNCTION update_parsing_job_status()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status <> 'init' THEN
            RAISE EXCEPTION 'Invalid initial status for parsing job: %', NEW.status;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status = OLD.status THEN
            RETURN NEW;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM status_model
            WHERE from_status = OLD.status AND to_status = NEW.status
        ) THEN
            RAISE EXCEPTION 'Transition from % to % is not allowed', OLD.status, NEW.status;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER parsing_job_check_status
BEFORE INSERT OR UPDATE OF status ON parsing_job
FOR EACH ROW EXECUTE FUNCTION update_parsing_job_status();

CREATE OR REPLACE FUNCTION clear_collected_objects_if_set_init_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'init' THEN
        DELETE FROM feedback_object WHERE parsing_job_id = NEW.id;
        UPDATE parsing_link SET is_parsed = FALSE WHERE parsing_job_id = NEW.id;
        DELETE FROM ai_report WHERE parsing_job_id = NEW.id;
        DELETE FROM statistical_report WHERE parsing_job_id = NEW.id;
        DELETE FROM liked_cards
        WHERE card_object_id IN (
            SELECT id FROM card_object WHERE parsing_job_id = NEW.id
        );

        DELETE FROM card_object WHERE parsing_job_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reset_init_status
AFTER UPDATE OF status ON parsing_job
FOR EACH ROW EXECUTE FUNCTION clear_collected_objects_if_set_init_status();

CREATE OR REPLACE FUNCTION create_stat_report(pj_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    total_count INTEGER;
    stat_report_id INTEGER;
    star_1_c INTEGER;
    star_2_c INTEGER;
    star_3_c INTEGER;
    star_4_c INTEGER;
    star_5_c INTEGER;
    purchased_state_count INTEGER;
    returned_state_count INTEGER;
    canceled_state_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO total_count
    FROM feedback_object f
    WHERE parsing_job_id = pj_id;

    IF total_count = 0 THEN
        RAISE EXCEPTION 'Cannot create statistical_report: no feedbacks for parsing_job_id=%', pj_id;
    END IF;


    INSERT INTO statistical_report (parsing_job_id, feedbacks_count)
    VALUES (pj_id, total_count)
    RETURNING id INTO stat_report_id;


    SELECT
        COUNT(*) FILTER (WHERE stars_rating = 1),
        COUNT(*) FILTER (WHERE stars_rating = 2),
        COUNT(*) FILTER (WHERE stars_rating = 3),
        COUNT(*) FILTER (WHERE stars_rating = 4),
        COUNT(*) FILTER (WHERE stars_rating = 5)
    INTO
        star_1_c,
        star_2_c,
        star_3_c,
        star_4_c,
        star_5_c
    FROM feedback_object
    WHERE parsing_job_id = pj_id;

    INSERT INTO stars_count (
        statistical_report_id,
        star_1_count,
        star_2_count,
        star_3_count,
        star_4_count,
        star_5_count
    ) VALUES (
        stat_report_id,
        star_1_c,
        star_2_c,
        star_3_c,
        star_4_c,
        star_5_c
    );

    SELECT
        COUNT(*) FILTER (WHERE feedback_state = 'purchased'),
        COUNT(*) FILTER (WHERE feedback_state = 'returned'),
        COUNT(*) FILTER (WHERE feedback_state = 'canceled')
    INTO
        purchased_state_count,
        returned_state_count,
        canceled_state_count
    FROM feedback_object
    WHERE parsing_job_id = pj_id;


    INSERT INTO feedback_states_count (
        statistical_report_id,
        purchased_count,
        returned_count,
        canceled_count
    ) VALUES (
        stat_report_id,
        purchased_state_count,
        returned_state_count,
        canceled_state_count
    );

    RETURN stat_report_id;
END;
$$ LANGUAGE plpgsql;


CREATE INDEX IF NOT EXISTS idx_feedback_object_pj ON feedback_object(parsing_job_id);
