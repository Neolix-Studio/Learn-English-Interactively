-- Erasure check (E0a, #385). LOCAL STACK ONLY: run it on the throwaway
-- database, never on the live one.
--
-- After `DELETE FROM users WHERE id = X`, lists every table in the database,
-- the columns in it that hold a user id, and how many rows still name X. A
-- complete erasure shows 0 on every line; a table with no user column shows
-- "(no user column)". Set @erased_id to X, then paste the whole file into
--   ./tools/local/testing/local_stack.sh sql "<this file>"
-- A user column is users.id, any column ending in user_id, or friend_id.

SET @erased_id = 1;
SET SESSION group_concat_max_len = 1000000;

SELECT GROUP_CONCAT(
         IF(c.column_name IS NULL,
            CONCAT('SELECT ''', t.table_name, ''' AS table_name, ''(no user column)'' AS user_column, NULL AS rows_left'),
            CONCAT('SELECT ''', t.table_name, ''', ''', c.column_name, ''', COUNT(*) FROM `', t.table_name,
                   '` WHERE `', c.column_name, '` = ', @erased_id))
         ORDER BY t.table_name, c.column_name SEPARATOR ' UNION ALL ')
  INTO @erasure_query
  FROM information_schema.tables t
  LEFT JOIN information_schema.columns c
    ON c.table_schema = t.table_schema AND c.table_name = t.table_name
   AND (c.column_name LIKE '%user_id' OR c.column_name = 'friend_id'
        OR (t.table_name = 'users' AND c.column_name = 'id'))
 WHERE t.table_schema = DATABASE() AND t.table_type = 'BASE TABLE';

PREPARE erasure_check FROM @erasure_query;
EXECUTE erasure_check;
DEALLOCATE PREPARE erasure_check;
