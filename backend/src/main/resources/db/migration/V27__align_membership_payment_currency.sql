ALTER TABLE membership_payments
    MODIFY COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'INR';
