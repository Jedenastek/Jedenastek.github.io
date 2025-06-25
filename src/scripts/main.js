/* ============================================
   SPOTIFY TOOL - MAIN APPLICATION SCRIPT
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎵 Spotify Tool - Modular Version Loading...');

    // Initialize APIs
    SpotifyAPI.init();

    // DOM Elements
    const landingPage = document.getElementById('landing-page');
    const enterAppButton = document.getElementById('enterAppButton');
    const enterSpotifyAppButtonOnLanding = document.getElementById('enterSpotifyAppButtonLandingPage');
    const mainAppContent = document.getElementById('main-app-content');
    const navButtons = document.querySelectorAll('.nav-button');
    const views = document.querySelectorAll('.view');
    const demoModeIndicator = document.getElementById('demo-mode-indicator');

    // Initialize Application
    function initializeApp() {
        console.log('Initializing Spotify Tool...');
        
        // Set up event listeners
        setupEventListeners();
        
        // Check for existing authentication
        checkAuthenticationStatus();
        
        // Load demo data
        loadDemoData();
        
        console.log('✅ Spotify Tool initialized successfully!');
    }

    // Event Listeners Setup
    function setupEventListeners() {
        // Landing page buttons
        if (enterAppButton) {
            enterAppButton.addEventListener('click', () => enterMainApp(true));
        }
        
        if (enterSpotifyAppButtonOnLanding) {
            enterSpotifyAppButtonOnLanding.addEventListener('click', () => {
                SpotifyAPI.redirectToLogin();
            });
        }

        // Navigation
        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetView = e.target.dataset.section;
                if (targetView) {
                    showView(targetView);
                    updateActiveNavButton(e.target);
                }
            });
        });

        // State change listener
        AppState.addStateListener((state) => {
            updateUI(state);
        });
    }

    // Authentication Status Check
    function checkAuthenticationStatus() {
        const savedToken = localStorage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
        
        if (savedToken) {
            SpotifyAPI.setAccessToken(savedToken);
            AppState.setState({ 
                accessToken: savedToken, 
                demoMode: false 
            });
        }

        // Handle Spotify callback
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('code')) {
            handleSpotifyCallback();
        }
    }

    // Handle Spotify OAuth callback
    async function handleSpotifyCallback() {
        try {
            const token = await SpotifyAPI.handleCallback();
            if (token) {
                await enterMainApp(false);
            }
        } catch (error) {
            console.error('Authentication failed:', error);
            alert(`Logowanie nie powiodło się: ${error.message}`);
            showLandingPage();
        }
    }

    // Enter Main Application
    async function enterMainApp(isDemoMode) {
        AppState.setState({ demoMode: isDemoMode });
        
        if (landingPage) landingPage.style.display = 'none';
        if (mainAppContent) mainAppContent.style.display = 'block';
        
        updateDemoModeIndicator();
        
        if (!isDemoMode && SpotifyAPI.isAuthenticated()) {
            try {
                await loadUserData();
            } catch (error) {
                console.error('Failed to load user data:', error);
                // Fallback to demo mode
                AppState.setState({ demoMode: true });
                updateDemoModeIndicator();
            }
        }
        
        await loadPlaylistData();
        showView('playlistsView');
    }

    // Show Landing Page
    function showLandingPage() {
        if (landingPage) landingPage.style.display = 'block';
        if (mainAppContent) mainAppContent.style.display = 'none';
    }

    // Update Demo Mode Indicator
    function updateDemoModeIndicator() {
        if (demoModeIndicator) {
            demoModeIndicator.textContent = AppState.demoMode ? 'Tryb Demo' : 'Połączono z Spotify';
            demoModeIndicator.style.display = 'inline-block';
        }
    }

    // Load User Data (Spotify)
    async function loadUserData() {
        try {
            const userProfile = await SpotifyAPI.getUserProfile();
            AppState.setState({
                user: {
                    name: userProfile.display_name,
                    email: userProfile.email,
                    avatar: userProfile.images?.[0]?.url
                }
            });
            console.log('✅ User data loaded:', userProfile.display_name);
        } catch (error) {
            console.error('Failed to load user profile:', error);
            throw error;
        }
    }

    // Load Demo Data
    function loadDemoData() {
        console.log('📦 Loading demo data...');
        // Demo data will be loaded when needed in playlist view
    }

    // Load Playlist Data
    async function loadPlaylistData() {
        const playlistContainer = document.getElementById('playlist-list-container');
        
        if (!playlistContainer) return;
        
        playlistContainer.innerHTML = '<li class="loading">Ładowanie playlist...</li>';
        
        try {
            let playlists;
            
            if (AppState.demoMode) {
                // Load demo playlists
                const response = await fetch('src/data/mock_playlist.json');
                const data = await response.json();
                playlists = { items: data };
            } else {
                // Load real Spotify playlists
                playlists = await SpotifyAPI.getUserPlaylists();
            }
            
            AppState.setState({ playlists: playlists.items });
            renderPlaylists(playlists.items);
            
        } catch (error) {
            console.error('Failed to load playlists:', error);
            playlistContainer.innerHTML = '<li class="empty-state">Nie udało się załadować playlist</li>';
        }
    }

    // Render Playlists
    function renderPlaylists(playlists) {
        const playlistContainer = document.getElementById('playlist-list-container');
        
        if (!playlistContainer || !playlists || playlists.length === 0) {
            playlistContainer.innerHTML = '<li class="empty-state"><h3>Brak playlist</h3><p>Nie znaleziono żadnych playlist.</p></li>';
            return;
        }
        
        playlistContainer.innerHTML = playlists.map(playlist => `
            <li class="playlist-item-container" data-playlist-id="${playlist.id}">
                <div class="playlist-item">
                    <img src="${playlist.images?.[0]?.url || 'src/data/mock_cover_playlist_1.jpeg'}" 
                         alt="${playlist.name}" class="playlist-cover">
                    <div class="playlist-info">
                        <h3>${playlist.name}</h3>
                        <p>${playlist.tracks?.total || 0} utworów • ${playlist.owner?.display_name || 'Nieznany'}</p>
                        ${playlist.description ? `<p>${playlist.description}</p>` : ''}
                    </div>
                </div>
            </li>
        `).join('');
        
        // Add click handlers
        playlistContainer.querySelectorAll('.playlist-item-container').forEach(item => {
            item.addEventListener('click', () => {
                const playlistId = item.dataset.playlistId;
                const playlist = playlists.find(p => p.id === playlistId);
                if (playlist) {
                    loadPlaylistTracks(playlist);
                }
            });
        });
    }

    // Load Playlist Tracks
    async function loadPlaylistTracks(playlist) {
        AppState.setState({ selectedPlaylist: playlist });
        
        const trackContainer = document.getElementById('track-list-container');
        const playlistNameEl = document.getElementById('current-playlist-name');
        
        if (playlistNameEl) {
            playlistNameEl.textContent = playlist.name;
        }
        
        if (trackContainer) {
            trackContainer.innerHTML = '<li class="loading">Ładowanie utworów...</li>';
        }
        
        try {
            let tracks;
            
            if (AppState.demoMode) {
                // Load demo tracks
                const response = await fetch(`src/data/mock_tracks_playlist_${playlist.id}.json`);
                tracks = await response.json();
            } else {
                // Load real Spotify tracks
                const response = await SpotifyAPI.getPlaylistTracks(playlist.id);
                tracks = response.items;
            }
            
            AppState.setState({ tracksWithFeatures: tracks });
            renderTracks(tracks);
            showView('tracksView');
            
        } catch (error) {
            console.error('Failed to load tracks:', error);
            if (trackContainer) {
                trackContainer.innerHTML = '<li class="empty-state">Nie udało się załadować utworów</li>';
            }
        }
    }

    // Render Tracks
    function renderTracks(tracks) {
        const trackContainer = document.getElementById('track-list-container');
        
        if (!trackContainer || !tracks || tracks.length === 0) {
            trackContainer.innerHTML = '<li class="empty-state"><h3>Brak utworów</h3><p>Ta playlista jest pusta.</p></li>';
            return;
        }
        
        trackContainer.innerHTML = tracks.map((item, index) => {
            const track = item.track || item;
            return `
                <li class="track-item-container">
                    <div class="track-item">
                        <div class="track-main-info">
                            <img src="${track.album?.images?.[0]?.url || 'src/data/mock_cover_playlist_1.jpeg'}" 
                                 alt="${track.name}" class="track-cover">
                            <div class="track-details">
                                <h4>${track.name}</h4>
                                <p>${track.artists?.map(a => a.name).join(', ') || 'Nieznany artysta'}</p>
                                <p>${track.album?.name || 'Nieznany album'}</p>
                            </div>
                        </div>
                        <div class="track-actions">
                            ${AppState.demoMode ? '<span class="mood-tag">Demo</span>' : ''}
                        </div>
                    </div>
                </li>
            `;
        }).join('');
    }

    // View Management
    function showView(viewId) {
        views.forEach(view => {
            view.classList.remove('active-view');
        });
        
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active-view');
            AppState.setState({ currentView: viewId });
        }
    }

    // Update Active Navigation Button
    function updateActiveNavButton(activeButton) {
        navButtons.forEach(btn => btn.classList.remove('active'));
        activeButton.classList.add('active');
    }

    // Update UI based on state
    function updateUI(state) {
        // Update user info display
        const userInfo = document.getElementById('user-info');
        const loginButtons = document.getElementById('login-buttons');
        const userName = document.getElementById('user-name');
        const userAvatar = document.getElementById('user-avatar');
        
        if (state.user.name && !state.demoMode) {
            if (userName) userName.textContent = state.user.name;
            if (userAvatar && state.user.avatar) userAvatar.src = state.user.avatar;
            if (userInfo) userInfo.style.display = 'flex';
            if (loginButtons) loginButtons.style.display = 'none';
        } else {
            if (userInfo) userInfo.style.display = 'none';
            if (loginButtons) loginButtons.style.display = 'block';
        }
    }

    // Back button handlers
    const backToPlaylistsButton = document.getElementById('back-to-playlists');
    if (backToPlaylistsButton) {
        backToPlaylistsButton.addEventListener('click', () => {
            showView('playlistsView');
        });
    }

    // Initialize the application
    initializeApp();
});
