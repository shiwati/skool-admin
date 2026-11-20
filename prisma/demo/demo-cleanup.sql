-- A demo-seed.sql által létrehozott összes adat törlése. Csak 'skooldemo_' id-jú rekordokat érint.
BEGIN;

-- Ha a felületen valódi jelentkezőt vontak össze demó jelentkezővel (vagy fordítva), a jelentkezések
-- átkerülhettek; a demó eseményhez tartozó jelentkezéseket az event kaszkád viszi.
DELETE FROM history
WHERE record_id LIKE 'skooldemo\_%'
   OR (table_name = 'event' AND record_id IN (SELECT id FROM event WHERE id LIKE 'skooldemo\_%'));

-- event_report, event_report_document, application, feedback: ON DELETE CASCADE
DELETE FROM event WHERE id LIKE 'skooldemo\_%';

-- duplicate_dismissal és a maradék application: ON DELETE CASCADE
DELETE FROM applicant WHERE id LIKE 'skooldemo\_%';

-- Ellenőrzés: mind 0 legyen
SELECT
  (SELECT count(*) FROM event       WHERE id LIKE 'skooldemo\_%') AS events,
  (SELECT count(*) FROM applicant   WHERE id LIKE 'skooldemo\_%') AS applicants,
  (SELECT count(*) FROM application WHERE id LIKE 'skooldemo\_%') AS applications,
  (SELECT count(*) FROM feedback    WHERE id LIKE 'skooldemo\_%') AS feedbacks,
  (SELECT count(*) FROM history     WHERE id LIKE 'skooldemo\_%') AS history;

COMMIT;
