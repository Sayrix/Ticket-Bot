/*
Copyright © 2023 小兽兽/zhiyan114 (github.com/zhiyan114)
File is licensed respectively under the terms of the Apache License 2.0
or whichever license the project is using at the time https://github.com/Sayrix/Ticket-Bot/blob/main/LICENSE

This file is from postgre.sql but modified for sqlite and mysql compatibility with prisma.
RANT: I LOVE AND HATE SQLITE. Why can't it just support a little more features...

For production use, please use "prisma db push" instead or follow the documentation: https://doc.ticket.pm/docs/intro.
*/


/*
this will be used for
* openTicketMessageId
* ticketCount
*/

CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
);

/*
this will be used for storing tickets
*/

CREATE TABLE IF NOT EXISTS tickets (
    id SERIAL PRIMARY KEY,
    channelid TEXT NOT NULL UNIQUE,
    messageid TEXT NOT NULL UNIQUE,
    category LONGTEXT NOT NULL,
    invited TEXT NOT NULL DEFAULT '[]',
    reason TEXT NOT NULL,
    creator TEXT NOT NULL,
    createdat BIGINT NOT NULL,
    claimedby TEXT,
    claimedat BIGINT,
    closedby TEXT,
    closedat BIGINT,
    closereason TEXT,
    transcript TEXT
);
