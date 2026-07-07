-- Reply to message
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Forward: original sender info (stored as JSON: { userId, displayName, username })
ALTER TABLE messages ADD COLUMN IF NOT EXISTS forward_from JSONB;

-- Privacy settings (stored as JSONB for flexibility)
-- { whoCanSeePhone: 'nobody'|'contacts'|'everyone', whoCanAddToGroups: 'nobody'|'contacts'|'everyone', whoCanSeeLastSeen: 'nobody'|'contacts'|'everyone', whoCanSeeBio: 'nobody'|'contacts'|'everyone' }
ALTER TABLE users ADD COLUMN IF NOT EXISTS privacy_settings JSONB;
