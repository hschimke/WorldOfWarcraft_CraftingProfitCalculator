-- SQLite
SELECT DISTINCT namespace from key_values;

-- Delete
DELETE FROM key_values WHERE namespace = 'craftable_by_profession';
DELETE FROM key_values WHERE namespace = 'craftable_by_professions_cache';
DELETE FROM key_values WHERE namespace = 'fetched_item_data';
DELETE FROM key_values WHERE namespace = 'item_search_cache';

-- Select
SELECT * FROM key_values WHERE namespace = 'profession_detail_data';