-- =====================================================
-- TrustLayer — Full Supabase Setup SQL
-- Run this in Supabase SQL Editor AFTER banking.md schema is applied
-- =====================================================

-- =====================================================
-- STEP 1: Extend users table with TrustLayer columns
-- =====================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash        TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role                 TEXT CHECK (role IN ('EMPLOYER','FREELANCER','ADMIN'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS pfi_score            INT  DEFAULT 500;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employer_trust_score INT  DEFAULT 500;
ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_account_id  TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS abandoned_projects   INT  DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended            BOOLEAN DEFAULT false;

-- =====================================================
-- STEP 2: Create projects table
-- =====================================================
CREATE TABLE IF NOT EXISTS projects (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    employer_id         UUID        NOT NULL REFERENCES users(id),
    freelancer_id       UUID        REFERENCES users(id),
    title               TEXT        NOT NULL,
    project_summary     TEXT        NOT NULL DEFAULT '',
    raw_requirement     TEXT        NOT NULL DEFAULT '',
    source_text         TEXT,
    category            TEXT        NOT NULL DEFAULT 'WRITING' CHECK (category IN ('WRITING', 'TRANSLATION', 'CODE')),
    total_budget        BIGINT      NOT NULL DEFAULT 0 CHECK (total_budget >= 0),
    milestone_pool      BIGINT      DEFAULT 0,
    success_fee         BIGINT      DEFAULT 0,
    escrow_held         BIGINT      DEFAULT 0,
    milestone_frozen    BIGINT      DEFAULT 0,
    status              TEXT        NOT NULL DEFAULT 'DRAFT'
                                    CHECK (status IN ('DRAFT','OPEN','FUNDED','IN_PROGRESS','COMPLETED','CANCELLED')),
    razorpay_order_id   TEXT,
    razorpay_payment_id TEXT,
    handover_document   TEXT,
    created_at          TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- =====================================================
-- STEP 3: Create milestones table
-- =====================================================
CREATE TABLE IF NOT EXISTS milestones (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id              UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sequence_number         INT         NOT NULL CHECK (sequence_number >= 1),
    title                   TEXT        NOT NULL,
    description             TEXT        NOT NULL,
    ai_success_criteria     TEXT        NOT NULL,
    weight_percentage       FLOAT       NOT NULL DEFAULT 0 CHECK (weight_percentage >= 0 AND weight_percentage <= 100),
    payout_amount           BIGINT      DEFAULT 0,
    payout_floor            BIGINT      DEFAULT 0,
    penalty_rate            FLOAT       DEFAULT 0,
    deadline                TIMESTAMP   NOT NULL,
    status                  TEXT        NOT NULL DEFAULT 'LOCKED'
                                        CHECK (status IN (
                                            'LOCKED','IN_PROGRESS','AI_EVALUATING','AI_REJECTED',
                                            'AI_REJECTED_FINAL','AI_APPROVED_PENDING','DISPUTE_ACTIVE',
                                            'COMPLETED_PAID','REFUNDED_PENALIZED'
                                        )),
    deliverable_text        TEXT,
    submission_count        INT         DEFAULT 0,
    ai_evaluation_json      JSONB,
    auto_release_at         TIMESTAMP,
    extension_requested     BOOLEAN     NOT NULL DEFAULT false,
    extension_new_deadline  TIMESTAMP,
    extension_reason        TEXT,
    final_payout            BIGINT,
    created_at              TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, sequence_number)
);

-- =====================================================
-- STEP 4: Create bids table
-- =====================================================
CREATE TABLE IF NOT EXISTS bids (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    freelancer_id   UUID        NOT NULL REFERENCES users(id),
    proposed_rate   BIGINT      NOT NULL CHECK (proposed_rate > 0),
    message         TEXT        NOT NULL,
    status          TEXT        NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING','ACCEPTED','REJECTED')),
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, freelancer_id)
);

-- =====================================================
-- STEP 5: Create disputes table
-- =====================================================
CREATE TABLE IF NOT EXISTS disputes (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    milestone_id    UUID        NOT NULL REFERENCES milestones(id),
    raised_by       UUID        NOT NULL REFERENCES users(id),
    dispute_type    TEXT        NOT NULL CHECK (dispute_type IN ('EMPLOYER_VETO','FREELANCER_ESCALATION')),
    arbitration_fee BIGINT      NOT NULL DEFAULT 0,
    ruling          TEXT        NOT NULL DEFAULT 'PENDING'
                                CHECK (ruling IN ('PENDING','EMPLOYER_WIN','FREELANCER_WIN')),
    admin_notes     TEXT,
    ruled_by        UUID        REFERENCES users(id),
    ruled_at        TIMESTAMP,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- =====================================================
-- STEP 6: Create indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_projects_employer_id    ON projects(employer_id);
CREATE INDEX IF NOT EXISTS idx_projects_freelancer_id  ON projects(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_projects_status         ON projects(status);
CREATE INDEX IF NOT EXISTS idx_milestones_project_id   ON milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status       ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_bids_project_id         ON bids(project_id);
CREATE INDEX IF NOT EXISTS idx_bids_freelancer_id      ON bids(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_milestone_id   ON disputes(milestone_id);
CREATE INDEX IF NOT EXISTS idx_disputes_ruling         ON disputes(ruling);
CREATE INDEX IF NOT EXISTS idx_transactions_from_account ON transactions(from_account);
CREATE INDEX IF NOT EXISTS idx_transactions_to_account   ON transactions(to_account);

-- =====================================================
-- STEP 7: Seed platform escrow account (FIXED UUID)
-- =====================================================
INSERT INTO users (id, name, email, phone, role, password_hash)
VALUES (
    'aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa',
    'TrustLayer Escrow',
    'escrow@trustlayer.internal',
    0,
    'ADMIN',
    'not-a-real-hash'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (user_id, balance, account_type)
VALUES ('aaaaaaaa-0000-0000-0000-aaaaaaaaaaaa', 0, 'business')
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- STEP 8: Seed admin user (password: admin123)
-- =====================================================
INSERT INTO users (id, name, email, phone, role, password_hash)
VALUES (
    gen_random_uuid(),
    'TrustLayer Admin',
    'admin@trustlayer.demo',
    9000000000,
    'ADMIN',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lewdBsAhZ4jB3OqPe'  -- admin123
) ON CONFLICT (email) DO NOTHING;

INSERT INTO accounts (user_id, balance, account_type)
SELECT id, 0, 'business' FROM users WHERE email = 'admin@trustlayer.demo'
ON CONFLICT (user_id) DO NOTHING;
