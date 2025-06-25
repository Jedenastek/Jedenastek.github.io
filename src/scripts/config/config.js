/* ============================================
   APPLICATION CONFIGURATION
   ============================================ */

const CONFIG = {
    // Spotify API Configuration
    SPOTIFY: {
        CLIENT_ID: 'd507e509a28740ab81b86008f5d98038',
        REDIRECT_URI: 'https://jedenastek.github.io/',
        SCOPES: [
            'user-read-private', 
            'user-read-email',
            'playlist-read-private', 
            'playlist-read-collaborative',
            'playlist-modify-public', 
            'playlist-modify-private',
            'user-top-read', 
            'user-read-recently-played'
        ].join(' ')
    },

    // Last.fm API Configuration
    LASTFM: {
        API_KEY: '1f7b909a0f862f54c238b9b1d23c8777',
        API_BASE_URL: 'https://ws.audioscrobbler.com/2.0/'
    },

    // Application Settings
    APP: {
        DEFAULT_RECOMMENDATION_LIMIT: 15,
        MIN_RECOMMENDATION_LIMIT: 5,
        MAX_RECOMMENDATION_LIMIT: 30,
        DEFAULT_VIEW: 'playlistsView',
        ANIMATION_DURATION: 500
    },

    // Local Storage Keys
    STORAGE_KEYS: {
        ACCESS_TOKEN: 'spotify_access_token',
        REFRESH_TOKEN: 'spotify_refresh_token',
        CODE_VERIFIER: 'spotify_code_verifier',
        USER_SETTINGS: 'spotify_tool_settings',
        CONTACT_MESSAGES: 'spotify_tool_contact_messages'
    }
};

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}
