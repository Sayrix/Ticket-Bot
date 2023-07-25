
CREATE OR REPLACE FUNCTION tickets_insert_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tickets_temp_log (ticket_id, action) VALUES (NEW.id, 'CREATED');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_after_insert
AFTER INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION tickets_insert_trigger();


CREATE OR REPLACE FUNCTION tickets_update_trigger()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tickets_temp_log (ticket_id, action) VALUES (NEW.id, 'UPDATED');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_after_update
AFTER UPDATE ON tickets
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION tickets_update_trigger();
