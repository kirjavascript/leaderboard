-- CURRENTLY MISSING
-- all of the extra context for each play (do we track this???)
-- place to fill in custom answer for "other" response.
-- the actual integrity checks for each jsonb
-- permissions per role
-- more authentication, once ctdb auth is up
-- ip tracking?
-- way to prevent multiple people from editing the same thing at once
-- do we want a rigid way to enforce lower standards for worse scores and higher standards for better scores? currently this is possible because final decision is with mod, but I think this could lead to inconsistency, and I want scorestack to encourage as much consistency as reasonable.
-- various relational integrity checks

DROP DATABASE IF EXISTS scorestack_dev;

CREATE DATABASE scorestack_dev;

\c scorestack_dev

GRANT USAGE ON SCHEMA public TO scorestack;
ALTER DEFAULT PRIVILEGES
	IN SCHEMA public
	GRANT ALL PRIVILEGES ON TABLES TO scorestack;
ALTER DEFAULT PRIVILEGES
	IN SCHEMA public
	GRANT ALL PRIVILEGES ON SEQUENCES TO scorestack;

-- Enums

CREATE TABLE playstyle_types
(
	display_name TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	CHECK (upper(display_name) = display_name AND
		char_length(display_name) <= 4)
);
INSERT INTO playstyle_types(display_name, name)
VALUES
	('DAS', 'DAS'),
	('TAP', 'Vibro tap'),
	('ROLL', 'Rolling'),
	('BFLY', 'Butterfly'),
	('MOJA', 'Mojatap');

CREATE TABLE region_types
(
	display_name TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	CHECK (upper(display_name) = display_name)
);
INSERT INTO region_types(display_name, name)
VALUES 
	('NTSC', 'NTSC'),
	('PAL', 'PAL');

-- TODO: For 'OTHER' cases, add custom text box.

CREATE TABLE platform_types
(
	display_name TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	CHECK (upper(display_name) = display_name AND
		char_length(display_name) <= 8)
);
INSERT INTO platform_types(display_name, name)
VALUES
	('CONSOLE', 'Console'),
	('EMU', 'Emulator'),
	('OTHER', 'Other');

CREATE TABLE controller_types
(
	display_name TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	CHECK (upper(display_name) = display_name AND
		char_length(display_name) <= 8)
);
INSERT INTO controller_types(display_name, name)
VALUES
	('NES', 'Standard controller'),
	('KB', 'Keyboard'),
	('OTHER', 'Other');

CREATE TABLE proof_types
(
	display_name TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	CHECK (upper(display_name) = display_name AND
		char_length(display_name) <= 16)
);
INSERT INTO proof_types(display_name, name)
VALUES
	('VIDEO', 'Video'),
	('H. VIEWER', 'History viewer'),
	('SCREENSHOT', 'Screenshot'),
	('CLAIM', 'Claim');

CREATE TABLE metric_types
(
	name TEXT PRIMARY KEY
);
INSERT INTO metric_types(name) VALUES ('maxint'), ('minfloat'), ('maxint2');

CREATE TABLE submission_status_types
(
	name TEXT PRIMARY KEY
);
INSERT INTO submission_status_types(name) VALUES ('PENDING'), ('APPROVED'), ('REJECTED');

CREATE TABLE role_types
(
	name TEXT PRIMARY KEY
);
INSERT INTO role_types(name) VALUES ('USER'), ('MOD'), ('ADMIN'), ('RESTRICTED');
-- Main tables

-- There are two types of users. Shadow users only have a name, and they are placeholders for historical data, or people without an account.
-- Linked users are the default, and have a lot of extra things associated.

-- for "shadow users", this is all that's needed. We can check if the id is present in linked_users to figure out what kind of user this is.
CREATE TABLE users
(
	id SERIAL PRIMARY KEY,
	name TEXT NOT NULL,
	CHECK (char_length(name) <= 32) -- max discord name length
);

-- how much should we cache and how much should we look up from ctdb?
CREATE TABLE linked_users
(
	id INT PRIMARY KEY REFERENCES users(id),
	ctdb_id TEXT NOT NULL,
	description TEXT NOT NULL DEFAULT '',
	-- current setup, used for submissions.
	playstyle TEXT REFERENCES playstyle_types(display_name),
	region TEXT REFERENCES region_types(display_name),
	platform TEXT REFERENCES platform_types(display_name),
	controller TEXT REFERENCES controller_types(display_name)
);

-- Currently, all mods can verify everything. may want restricted permissions in the future.
CREATE TABLE plays
(
	id SERIAL PRIMARY KEY,
	user_id INT REFERENCES users(id),
	contributor_id INT REFERENCES users(id), -- TODO: reference linked users when we can test for it
	-- Playstyle
	playstyle TEXT REFERENCES playstyle_types(display_name),
	region TEXT REFERENCES region_types(display_name),
	platform TEXT REFERENCES platform_types(display_name),
	controller TEXT REFERENCES controller_types(display_name),
	-- Proof context. Technically encompasses proof links, but that's a diff table.
	is_high_proof BOOLEAN, -- decision by mod if the play should appear on the default of each leaderboard the play is submitted to.
	-- Misc. context
	user_comment TEXT NOT NULL DEFAULT '',
	-- Logistics
	date_played TIMESTAMP NOT NULL,
	date_submitted TIMESTAMP NOT NULL DEFAULT NOW()::timestamp,
	status TEXT REFERENCES submission_status_types(name) NOT NULL,
	verifier INT REFERENCES users(id), -- TODO: enforce this person being a linked user, then mod
	verifier_comment TEXT NOT NULL DEFAULT '' -- explain justification
);

-- currently the only context. may contain zipped replay file eventually?
CREATE TABLE proof_links
(
	id SERIAL PRIMARY KEY,
	play_id INT REFERENCES plays(id),
	proof_link TEXT NOT NULL
);

-- Tentative strategy for leaderboard queries:
-- First, get metric so we know what table to look for.
-- Then, query the corresponding table (e.g. maxint_entries), joining the relevant user info.
-- It's done this way so we have the ability to index on metric, which I think gets weird if we dump everything into the same table and use a jsonb to store the metric.

CREATE TABLE leaderboards
(
	id SERIAL,
	name TEXT NOT NULL,
	description TEXT NOT NULL,
	metric TEXT REFERENCES metric_types(name),
	-- TODO: actually define preset
	custom_field_schema JSONB NOT NULL DEFAULT '{}', -- check that it's depth 1
	PRIMARY KEY (id, custom_field_schema)
);


-- Entries contain more leaderboard-specific information
-- date_added/status is not redundant with the referenced play! We need to separately check if a play actually belongs with the category.
-- also is there a better way to do this without copying literally 90% of the columns???

-- e.g. high score/lines
CREATE TABLE maxint_entries
(
	play_id INT REFERENCES plays(id),
	leaderboard_id INT NOT NULL,
	custom_field_schema JSONB NOT NULL,
	value INT NOT NULL,

	-- TODO: CHECK custom_fields consistent with custom_field_schema
	custom_fields JSONB,
	-- logistics
	date_added TIMESTAMP NOT NULL DEFAULT NOW()::timestamp,
	status TEXT REFERENCES submission_status_types(name) NOT NULL,

	FOREIGN KEY (leaderboard_id, custom_field_schema)
		REFERENCES leaderboards(id, custom_field_schema),

	PRIMARY KEY (play_id, leaderboard_id)
);

-- e.g. earliest max
CREATE TABLE minfloat_entries
(
	play_id INT REFERENCES plays(id),
	leaderboard_id INT NOT NULL,
	custom_field_schema JSONB NOT NULL,
	value FLOAT NOT NULL, -- TODO: use something that probably has more consistency
	-- TODO: CHECK custom_fields consistent with custom_field_schema
	custom_fields JSONB,
	-- logistics
	date_added TIMESTAMP NOT NULL DEFAULT NOW()::timestamp,
	status TEXT REFERENCES submission_status_types(name) NOT NULL,

	FOREIGN KEY (leaderboard_id, custom_field_schema)
		REFERENCES leaderboards(id, custom_field_schema),

	PRIMARY KEY (play_id, leaderboard_id)
);

-- e.g. consecutive max+kicker
CREATE TABLE maxint2_entries
(
	play_id INT REFERENCES plays(id),
	leaderboard_id INT NOT NULL,
	custom_field_schema JSONB NOT NULL,
	value1 INT NOT NULL,
	value2 INT NOT NULL,

	-- TODO: CHECK custom_fields consistent with custom_field_schema
	custom_fields JSONB,
	-- logistics
	date_added TIMESTAMP NOT NULL DEFAULT NOW()::timestamp,
	status TEXT REFERENCES submission_status_types(name) NOT NULL,

	FOREIGN KEY (leaderboard_id, custom_field_schema)
		REFERENCES leaderboards(id, custom_field_schema),

	PRIMARY KEY (play_id, leaderboard_id)
);
