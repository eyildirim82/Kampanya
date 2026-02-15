-- Rate limiting table to prevent brute force attacks
CREATE TABLE IF NOT EXISTS rate_limit (
    ip_address INET NOT NULL,
    endpoint TEXT NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (ip_address, endpoint)
);

CREATE INDEX idx_rate_limit_window ON rate_limit(window_start);

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_ip_address INET,
    p_endpoint TEXT,
    p_max_requests INTEGER DEFAULT 10,
    p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current count and window start for this IP and endpoint
    SELECT request_count, window_start 
    INTO v_count, v_window_start
    FROM rate_limit
    WHERE ip_address = p_ip_address 
    AND endpoint = p_endpoint;
    
    -- If no record exists or window expired, create/reset
    IF v_count IS NULL OR v_window_start < NOW() - (p_window_minutes || ' minutes')::INTERVAL THEN
        INSERT INTO rate_limit (ip_address, endpoint, request_count, window_start)
        VALUES (p_ip_address, p_endpoint, 1, NOW())
        ON CONFLICT (ip_address, endpoint) 
        DO UPDATE SET 
            request_count = 1,
            window_start = NOW();
        RETURN TRUE;
    END IF;
    
    -- Check if limit exceeded
    IF v_count >= p_max_requests THEN
        RETURN FALSE;
    END IF;
    
    -- Increment counter
    UPDATE rate_limit 
    SET request_count = request_count + 1
    WHERE ip_address = p_ip_address 
    AND endpoint = p_endpoint;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function for old rate limit records
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limit 
    WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Note: To enable periodic cleanup, you would use pg_cron extension:
-- SELECT cron.schedule('cleanup-rate-limits', '0 * * * *', 'SELECT cleanup_rate_limits()');
-- This requires pg_cron extension which may not be available on all Supabase tiers
