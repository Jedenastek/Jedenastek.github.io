/* ============================================
   APPLICATION STATE MANAGEMENT
   ============================================ */

const AppState = {
    // Core State
    demoMode: true,
    accessToken: null,
    currentView: 'playlistsView',
    appInitialized: false,
    previousDemoMode: true,

    // Data State
    playlists: [],
    selectedPlaylist: null,
    tracksWithFeatures: [],
    currentMoodFilter: 'all',

    // User State
    user: {
        name: null,
        avatar: null,
        email: null
    },

    // Settings State
    settings: {
        theme: 'light',
        accentColor: '#1DB954',
        fontSize: 'medium',
        recommendationLimit: 15,
        userName: ''
    },

    // Methods
    setState(newState) {
        Object.assign(this, newState);
        this.notifyStateChange();
    },

    getState() {
        return { ...this };
    },

    resetToDemo() {
        this.setState({
            demoMode: true,
            accessToken: null,
            playlists: [],
            selectedPlaylist: null,
            tracksWithFeatures: [],
            currentMoodFilter: 'all',
            user: {
                name: null,
                avatar: null,
                email: null
            }
        });
    },

    // State change listeners
    listeners: [],

    addStateListener(callback) {
        this.listeners.push(callback);
    },

    removeStateListener(callback) {
        this.listeners = this.listeners.filter(listener => listener !== callback);
    },

    notifyStateChange() {
        this.listeners.forEach(callback => callback(this.getState()));
    }
};

// Initialize with saved settings
const savedSettings = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_SETTINGS);
if (savedSettings) {
    try {
        const settings = JSON.parse(savedSettings);
        AppState.setState({ settings: { ...AppState.settings, ...settings } });
    } catch (e) {
        console.warn('Could not parse saved settings:', e);
    }
}
