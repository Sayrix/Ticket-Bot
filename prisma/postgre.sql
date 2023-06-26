/*
Copyright © 2023 小兽兽/zhiyan114 (github.com/zhiyan114)
File is licensed respectively under the terms of the Apache License 2.0
or whichever license the project is using at the time https://github.com/Sayrix/Ticket-Bot/blob/main/LICENSE

For production use, please don't try to use this file, even if you're using postgresql,
Since the code is tailored towards compatibility.sql, it will break.
You have been warned.

I wrote this in-case multi-db support will eventually be dropped, and I'm a big postgresql fan ^w^
*/



/*
this will be used for
* openTicketMessageId
* ticketCount
*/

CREATE TABLE IF NOT EXISTS config (
    key VARCHAR(256) PRIMARY KEY,
    value LONGTEXT
);

/*
this will be used for storing tickets
*/

CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    channelid TEXT NOT NULL UNIQUE,
    messageid TEXT NOT NULL UNIQUE,
    category JSON NOT NULL,
    reason TEXT NOT NULL,
    creator TEXT NOT NULL,
    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
    claimedby TEXT,
    claimedat TIMESTAMP,
    closedby TEXT,
    closedat TIMESTAMP,
    closereason TEXT,
    transcript TEXT
);

/*
this will be used to handle ticket invites
*/

CREATE TABLE IF NOT EXISTS invites (
    id SERIAL PRIMARY KEY,
    ticketid TEXT NOT NULL,
    userid TEXT NOT NULL,
	CONSTRAINT FK_ticketID FOREIGN KEY(ticketid) REFERENCES tickets(messageid) ON DELETE CASCADE
);
