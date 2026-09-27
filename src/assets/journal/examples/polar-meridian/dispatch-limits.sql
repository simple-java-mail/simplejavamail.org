-- Application tables, NOT settings pushed to an SMTP provider.
-- PostgreSQL. Provision limits administratively; producers must not edit them.
CREATE TABLE mail_dispatch_limit (
    quota_scope VARCHAR(200) NOT NULL,
    workload VARCHAR(20) NOT NULL CHECK (workload IN ('URGENT', 'ROUTINE', 'BULK')),
    per_second BIGINT NOT NULL CHECK (per_second >= 0),
    per_24_hours BIGINT NOT NULL CHECK (per_24_hours >= 0),
    PRIMARY KEY (quota_scope, workload)
);

CREATE TABLE mail_dispatch_charge (
    attempt_id VARCHAR(255) PRIMARY KEY,
    request_id VARCHAR(200) NOT NULL,
    quota_scope VARCHAR(200) NOT NULL,
    workload VARCHAR(20) NOT NULL,
    recipients INTEGER NOT NULL CHECK (recipients > 0),
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL,
    finished_at TIMESTAMP WITH TIME ZONE,
    FOREIGN KEY (quota_scope, workload) REFERENCES mail_dispatch_limit (quota_scope, workload)
);

CREATE INDEX mail_dispatch_charge_usage
    ON mail_dispatch_charge (quota_scope, workload, finished_at, granted_at);

-- Illustrative allocations for THIS service in Europe, not AWS defaults or
-- measured Polar Meridian traffic. Together: 200 recipients/s and 2 million/24h.
-- The messaging team must approve their combined use, account for other senders,
-- and leave operational margin below the actual upstream limits.
INSERT INTO mail_dispatch_limit VALUES
    ('eu-application-mail', 'URGENT', 100, 200000),
    ('eu-application-mail', 'ROUTINE', 20, 1200000),
    ('eu-application-mail', 'BULK', 80, 600000);

-- Retention maintenance may delete completed charges older than 24 hours.
-- Never purge unfinished charges by age alone: investigate their request/attempt
-- records first. A crashed dispatcher may have submitted the message successfully.
