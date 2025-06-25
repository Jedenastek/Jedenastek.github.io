/* ============================================
   SPOTIFY API MODULE
   ============================================ */

const SpotifyAPI = {
    spotifyApi: null,

    init() {
        this.spotifyApi = new SpotifyWebApi();
        return this;
    },

    // Authentication Methods
    async redirectToLogin() {
        const codeVerifier = this.generateRandomString(64);
        localStorage.setItem(CONFIG.STORAGE_KEYS.CODE_VERIFIER, codeVerifier);
        
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        const authUrlParams = new URLSearchParams({
            client_id: CONFIG.SPOTIFY.CLIENT_ID,
            response_type: 'code',
            redirect_uri: CONFIG.SPOTIFY.REDIRECT_URI,
            scope: CONFIG.SPOTIFY.SCOPES,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
            show_dialog: 'true'
        });
        
        window.location.href = `https://accounts.spotify.com/authorize?${authUrlParams.toString()}`;
    },

    async handleCallback() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');
        
        if (error) {
            throw new Error(`Authentication failed: ${error}`);
        }
        
        if (code) {
            const codeVerifier = localStorage.getItem(CONFIG.STORAGE_KEYS.CODE_VERIFIER);
            if (!codeVerifier) {
                throw new Error('Code verifier not found');
            }
            
            const token = await this.getAccessToken(code, codeVerifier);
            localStorage.removeItem(CONFIG.STORAGE_KEYS.CODE_VERIFIER);
            
            if (token) {
                window.history.pushState({}, '', CONFIG.SPOTIFY.REDIRECT_URI);
                this.setAccessToken(token);
                return token;
            }
        }
        
        return null;
    },

    async getAccessToken(code, codeVerifier) {
        const payload = {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: CONFIG.SPOTIFY.CLIENT_ID,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: CONFIG.SPOTIFY.REDIRECT_URI,
                code_verifier: codeVerifier
            })
        };
        
        try {
            const response = await fetch('https://accounts.spotify.com/api/token', payload);
            if (!response.ok) {
                const data = await response.json().catch(() => ({ 
                    error_description: response.statusText 
                }));
                throw new Error(`HTTP ${response.status}: ${data.error_description || data.error || 'Server error'}`);
            }
            
            const data = await response.json();
            localStorage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, data.access_token);
            
            if (data.refresh_token) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, data.refresh_token);
            }
            
            return data.access_token;
        } catch (error) {
            console.error('Token exchange failed:', error);
            throw error;
        }
    },

    setAccessToken(token) {
        AppState.setState({ accessToken: token });
        this.spotifyApi.setAccessToken(token);
    },

    logout() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
        AppState.resetToDemo();
        this.spotifyApi.setAccessToken(null);
    },

    // API Methods
    async getUserProfile() {
        try {
            return await this.spotifyApi.getMe();
        } catch (error) {
            console.error('Failed to get user profile:', error);
            throw error;
        }
    },

    async getUserPlaylists() {
        try {
            return await this.spotifyApi.getUserPlaylists();
        } catch (error) {
            console.error('Failed to get user playlists:', error);
            throw error;
        }
    },

    async getPlaylistTracks(playlistId) {
        try {
            return await this.spotifyApi.getPlaylistTracks(playlistId);
        } catch (error) {
            console.error('Failed to get playlist tracks:', error);
            throw error;
        }
    },

    async getAudioFeatures(trackIds) {
        try {
            return await this.spotifyApi.getAudioFeaturesForTracks(trackIds);
        } catch (error) {
            console.error('Failed to get audio features:', error);
            throw error;
        }
    },

    async getTopArtists(timeRange = 'medium_term', limit = 20) {
        try {
            return await this.spotifyApi.getMyTopArtists({ 
                time_range: timeRange, 
                limit: limit 
            });
        } catch (error) {
            console.error('Failed to get top artists:', error);
            throw error;
        }
    },

    async getTopTracks(timeRange = 'medium_term', limit = 20) {
        try {
            return await this.spotifyApi.getMyTopTracks({ 
                time_range: timeRange, 
                limit: limit 
            });
        } catch (error) {
            console.error('Failed to get top tracks:', error);
            throw error;
        }
    },

    async getRecentlyPlayed(limit = 20) {
        try {
            return await this.spotifyApi.getMyRecentlyPlayedTracks({ limit: limit });
        } catch (error) {
            console.error('Failed to get recently played tracks:', error);
            throw error;
        }
    },

    // Utility Methods
    generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    async sha256(plain) {
        const encoder = new TextEncoder();
        const data = encoder.encode(plain);
        return window.crypto.subtle.digest('SHA-256', data);
    },

    base64encode(input) {
        return btoa(String.fromCharCode(...new Uint8Array(input)))
            .replace(/=/g, '')
            .replace(/\\+/g, '-')
            .replace(/\\//g, '_');
    },

    async generateCodeChallenge(verifier) {
        const hashed = await this.sha256(verifier);
        return this.base64encode(hashed);
    },

    isAuthenticated() {
        return !!AppState.accessToken;
    }
};
