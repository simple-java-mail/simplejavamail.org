import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Illustrative PostgreSQL-backed dispatch limits. All dispatcher instances use
 * the same database and pre-provisioned scope/workload rows; see dispatch-limits.sql.
 * This controls application admissions, not the precise instant SMTP transmits.
 */
public final class JdbcDispatchLimits implements PolarMeridianDispatcher.SendLimits {
    private final DataSource database;

    public JdbcDispatchLimits(DataSource database) {
        this.database = database;
    }

    @Override
    public boolean tryAcquire(String attemptId, String requestId, String scope,
            PolarMeridianDispatcher.Workload workload, int recipients) throws SQLException {
        if (recipients < 1) {
            throw new IllegalArgumentException("Count all final envelope recipients before dispatch");
        }
        try (Connection tx = database.getConnection()) {
            tx.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED);
            tx.setAutoCommit(false);
            try {
                Limit limit = lockLimit(tx, scope, workload);
                if (limit.perSecond > 0 && limit.per24Hours > 0
                        && (recipients > limit.perSecond || recipients > limit.per24Hours)) {
                    throw new IllegalArgumentException("Message has more recipients than this workload can admit at once");
                }
                Instant now = databaseTime(tx);
                Usage used = countUsage(tx, scope, workload, now);
                if (recipients > limit.perSecond - used.lastSecond
                        || recipients > limit.per24Hours - used.retainedDay) {
                    tx.rollback();
                    return false;
                }
                insertCharge(tx, attemptId, requestId, scope, workload, recipients, now);
                tx.commit();
                return true;
            } catch (SQLException | RuntimeException failure) {
                try {
                    tx.rollback();
                } catch (SQLException rollbackFailure) {
                    failure.addSuppressed(rollbackFailure);
                }
                throw failure;
            }
        }
    }

    private Limit lockLimit(Connection tx, String scope,
            PolarMeridianDispatcher.Workload workload) throws SQLException {
        try (PreparedStatement statement = statement(tx,
                "SELECT per_second, per_24_hours FROM mail_dispatch_limit " +
                        "WHERE quota_scope = ? AND workload = ? FOR UPDATE")) {
            statement.setString(1, scope);
            statement.setString(2, workload.name());
            try (ResultSet row = statement.executeQuery()) {
                if (!row.next()) {
                    throw new SQLException("No approved dispatch limit for " + scope + "/" + workload);
                }
                return new Limit(row.getLong(1), row.getLong(2));
            }
        }
    }

    private Usage countUsage(Connection tx, String scope,
            PolarMeridianDispatcher.Workload workload, Instant now) throws SQLException {
        try (PreparedStatement statement = statement(tx,
                "SELECT COALESCE(SUM(CASE WHEN granted_at > ? THEN recipients ELSE 0 END), 0), " +
                        "COALESCE(SUM(recipients), 0) FROM mail_dispatch_charge " +
                        "WHERE quota_scope = ? AND workload = ? " +
                        "AND (finished_at IS NULL OR finished_at > ?)")) {
            statement.setTimestamp(1, Timestamp.from(now.minusSeconds(1)));
            statement.setString(2, scope);
            statement.setString(3, workload.name());
            statement.setTimestamp(4, Timestamp.from(now.minus(24, ChronoUnit.HOURS)));
            try (ResultSet row = statement.executeQuery()) {
                row.next();
                return new Usage(row.getLong(1), row.getLong(2));
            }
        }
    }

    private void insertCharge(Connection tx, String attemptId, String requestId, String scope,
            PolarMeridianDispatcher.Workload workload, int recipients, Instant now) throws SQLException {
        try (PreparedStatement statement = statement(tx,
                "INSERT INTO mail_dispatch_charge " +
                        "(attempt_id, request_id, quota_scope, workload, recipients, granted_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?)")) {
            statement.setString(1, attemptId);
            statement.setString(2, requestId);
            statement.setString(3, scope);
            statement.setString(4, workload.name());
            statement.setInt(5, recipients);
            statement.setTimestamp(6, Timestamp.from(now));
            statement.executeUpdate();
        }
    }

    @Override
    public void complete(String attemptId) throws SQLException {
        // Retain the charge for 24 hours AFTER completion, not admission: a message
        // may wait in a local queue. Unfinished/uncertain charges do not expire here.
        execute("UPDATE mail_dispatch_charge SET finished_at = clock_timestamp() " +
                "WHERE attempt_id = ? AND finished_at IS NULL", attemptId);
    }

    @Override
    public void releaseUnsent(String attemptId) throws SQLException {
        // Only call with proof no SMTP work occurred, e.g. QUEUE_FULL.
        execute("DELETE FROM mail_dispatch_charge WHERE attempt_id = ?", attemptId);
    }

    private void execute(String sql, String attemptId) throws SQLException {
        try (Connection connection = database.getConnection()) {
            connection.setAutoCommit(true);
            try (PreparedStatement statement = statement(connection, sql)) {
                statement.setString(1, attemptId);
                statement.executeUpdate();
            }
        }
    }

    private Instant databaseTime(Connection tx) throws SQLException {
        // Read the actual database clock after acquiring the lock, rather than
        // PostgreSQL's transaction-start CURRENT_TIMESTAMP or each worker's clock.
        try (PreparedStatement statement = statement(tx, "SELECT clock_timestamp()");
                ResultSet row = statement.executeQuery()) {
            row.next();
            return row.getTimestamp(1).toInstant();
        }
    }

    private PreparedStatement statement(Connection connection, String sql) throws SQLException {
        PreparedStatement statement = connection.prepareStatement(sql);
        statement.setQueryTimeout(2);
        return statement;
    }

    private static final class Limit {
        final long perSecond;
        final long per24Hours;

        Limit(long perSecond, long per24Hours) {
            this.perSecond = perSecond;
            this.per24Hours = per24Hours;
        }
    }

    private static final class Usage {
        final long lastSecond;
        final long retainedDay;

        Usage(long lastSecond, long retainedDay) {
            this.lastSecond = lastSecond;
            this.retainedDay = retainedDay;
        }
    }
}
