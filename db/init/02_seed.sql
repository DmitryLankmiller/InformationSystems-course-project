INSERT INTO app_user (login, name, email)
VALUES ('global', 'globalUser', 'global-user@mail.ru')
ON CONFLICT (login) DO NOTHING;

INSERT INTO project (name, description)
VALUES ('globalProject', 'Temporary global project')
ON CONFLICT (name) DO NOTHING;