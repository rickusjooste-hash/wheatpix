update auth.users
set raw_user_meta_data = raw_user_meta_data || '{"role": "super"}'::jsonb
where email = 'mariusc@nexusag.net';
