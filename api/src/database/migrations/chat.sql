-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS sia_chat_rooms (
    room_id VARCHAR(36) PRIMARY KEY,
    group_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES sia_groups(group_id) ON DELETE CASCADE
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS sia_chat_messages (
    message_id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    message TEXT NOT NULL,
    media_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES sia_chat_rooms(room_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES sia_users(user_id) ON DELETE CASCADE
);

-- Create chat_participants table
CREATE TABLE IF NOT EXISTS sia_chat_participants (
    participant_id VARCHAR(36) PRIMARY KEY,
    room_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    last_read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES sia_chat_rooms(room_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES sia_users(user_id) ON DELETE CASCADE,
    UNIQUE(room_id, user_id)
);

-- Add indexes for better performance
CREATE INDEX idx_chat_rooms_group_id ON sia_chat_rooms(group_id);
CREATE INDEX idx_chat_messages_room_id ON sia_chat_messages(room_id);
CREATE INDEX idx_chat_messages_user_id ON sia_chat_messages(user_id);
CREATE INDEX idx_chat_participants_room_id ON sia_chat_participants(room_id);
CREATE INDEX idx_chat_participants_user_id ON sia_chat_participants(user_id); 