CREATE TABLE tasks (
                       id BIGSERIAL PRIMARY KEY,
                       title VARCHAR(160) NOT NULL,
                       description TEXT,
                       difficulty VARCHAR(20) NOT NULL,
                       status VARCHAR(20) NOT NULL,
                       deadline_date DATE,
                       created_at TIMESTAMP NOT NULL,
                       updated_at TIMESTAMP NOT NULL
);