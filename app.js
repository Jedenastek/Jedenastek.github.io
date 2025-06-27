document.addEventListener('DOMContentLoaded', () => {
    const SPOTIFY_CLIENT_ID = 'd507e509a28740ab81b86008f5d98038';
    const SPOTIFY_REDIRECT_URI = 'https://jedenastek.github.io/';
    const SPOTIFY_SCOPES = [
        'user-read-private', 'user-read-email',
        'playlist-read-private', 'playlist-read-collaborative',
        'playlist-modify-public', 'playlist-modify-private',
        'user-top-read', 'user-read-recently-played'
    ].join(' ');

    const LASTFM_API_KEY = '1f7b909a0f862f54c238b9b1d23c8777';
    const LASTFM_API_BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

    let appState = {
        demoMode: true,
        accessToken: null,
        currentView: 'playlistsView',
        playlists: [],
        selectedPlaylist: null,
        tracksWithFeatures: [],
        currentMoodFilter: 'all',
        appInitialized: false,
        previousDemoMode: true
    };

    const spotifyApi = new SpotifyWebApi();

    const landingPage = document.getElementById('landing-page');
    const enterAppButton = document.getElementById('enterAppButton');
    const enterSpotifyAppButtonOnLanding = landingPage ? landingPage.querySelector('#enterSpotifyAppButtonLandingPage') : null;
    const mainAppContent = document.getElementById('main-app-content');
    const navButtons = document.querySelectorAll('.nav-button');
    const views = document.querySelectorAll('.view');

    const playlistsView = document.getElementById('playlistsView');
    const recommendationsView = document.getElementById('recommendationsView');
    const userStatsView = document.getElementById('userStatsView');
    const demoModeIndicator = document.getElementById('demo-mode-indicator');
    const userInfoEl = document.getElementById('user-info');
    const userNameEl = document.getElementById('user-name');
    const userAvatarEl = document.getElementById('user-avatar');
    const logoutButton = document.getElementById('logout-button');
    const loginButtonsContainer = document.getElementById('login-buttons');
    const spotifyLoginButtonHeader = loginButtonsContainer ? loginButtonsContainer.querySelector('#enterSpotifyAppButtonHeader') : null;

    const playlistListContainer = document.getElementById('playlist-list-container');
    const currentPlaylistNameEl = document.getElementById('current-playlist-name');
    const trackListContainer = document.getElementById('track-list-container');
    const backToPlaylistsButton = document.getElementById('back-to-playlists');

    const moodFilterControls = document.getElementById('mood-filter-controls');
    const moodFilterButtons = document.querySelectorAll('.mood-filter-button');

    const recommendationListContainer = document.getElementById('recommendation-list-container');
    const backToPlaylistTracksButton = document.getElementById('backToPlaylistTracksButton');

    const topArtistsListEl = document.getElementById('top-artists-list');
    const topTracksListEl = document.getElementById('top-tracks-list');
    const recentlyPlayedListEl = document.getElementById('recently-played-list');

    const appSettingsForm = document.getElementById('app-settings-form');
    const appSettingsFeedbackEl = document.getElementById('app-settings-feedback');
    const accentColorInput = document.getElementById('accentColor');
    const resetAppSettingsButton = document.getElementById('reset-app-settings-button');

    const contactMessageForm = document.getElementById('contact-message-form');
    const contactFormFeedbackEl = document.getElementById('contact-form-feedback');
    const contactEmailInput = document.getElementById('contactEmail');
    const messageSubjectSelect = document.getElementById('messageSubject');
    const otherSubjectContainer = document.getElementById('otherSubjectContainer');
    const otherSubjectText = document.getElementById('otherSubjectText');
    const userMessageTextarea = document.getElementById('userMessage');
    const charCountEl = document.getElementById('charCount');
    const agreeToTermsCheckbox = document.getElementById('agreeToTerms');
    const resetContactFormButton = document.getElementById('reset-contact-form-button');

    const aboutAppContentEl = document.getElementById('about-app-content');

    function generateRandomString(length) {
        let t = "";
        const p = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < length; i++) t += p.charAt(Math.floor(Math.random() * p.length));
        return t;
    }

    async function sha256(p) {
        const e = new TextEncoder();
        const d = e.encode(p);
        return window.crypto.subtle.digest('SHA-256', d);
    }

    function base64encode(i) {
        return btoa(String.fromCharCode(...new Uint8Array(i))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    }

    async function generateCodeChallenge(v) {
        const h = await sha256(v);
        return base64encode(h);
    }

    function validateField(inputEl, validationFn, errorMsg) {
        if (!inputEl) return true;
        const msgEl = inputEl.closest('div').querySelector('.validation-message');
        if (!validationFn(inputEl.value, inputEl)) {
            if (msgEl) msgEl.textContent = errorMsg;
            inputEl.classList.add('input-invalid');
            inputEl.setCustomValidity(errorMsg);
            return false;
        } else {
            if (msgEl) msgEl.textContent = '';
            inputEl.classList.remove('input-invalid');
            inputEl.setCustomValidity('');
            return true;
        }
    }

    async function redirectToSpotifyLogin() {
        const codeVerifier = generateRandomString(64);
        localStorage.setItem('spotify_code_verifier', codeVerifier);
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        const authUrlParams = new URLSearchParams({
            client_id: SPOTIFY_CLIENT_ID,
            response_type: 'code',
            redirect_uri: SPOTIFY_REDIRECT_URI,
            scope: SPOTIFY_SCOPES,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge,
            show_dialog: 'true'
        });
        window.location.href = `https://accounts.spotify.com/authorize?${authUrlParams.toString()}`;
    }

    if (enterSpotifyAppButtonOnLanding) {
        enterSpotifyAppButtonOnLanding.addEventListener('click', () => {
            redirectToSpotifyLogin();
        });
    }

    if (spotifyLoginButtonHeader) {
        spotifyLoginButtonHeader.addEventListener('click', () => {
            redirectToSpotifyLogin();
        });
    }

    async function getAccessToken(code, codeVerifier) {
        const payload = {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: SPOTIFY_CLIENT_ID,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: SPOTIFY_REDIRECT_URI,
                code_verifier: codeVerifier
            })
        };
        try {
            const response = await fetch('https://accounts.spotify.com/api/token', payload);
            if (!response.ok) {
                const d = await response.json().catch(() => ({ error_description: response.statusText }));
                throw new Error(`HTTP ${response.status}: ${d.error_description || d.error || 'Błąd serwera'}`);
            }
            const data = await response.json();
            localStorage.setItem('spotify_access_token', data.access_token);
            if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
            appState.accessToken = data.access_token;
            spotifyApi.setAccessToken(appState.accessToken);
            return data.access_token;
        } catch (e) {
            alert(`Błąd logowania: ${e.message}`);
            clearSpotifyDataAndLogout();
            return null;
        }
    }

    async function handleSpotifyCallback() {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const error = params.get('error');
        if (error) {
            alert(`Logowanie nie powiodło się: ${error}.`);
            window.history.pushState({}, '', SPOTIFY_REDIRECT_URI);
            updateLoginUI();
            return;
        }
        if (code) {
            const codeVerifier = localStorage.getItem('spotify_code_verifier');
            if (!codeVerifier) {
                alert("Błąd logowania krytyczny.");
                clearSpotifyDataAndLogout();
                return;
            }
            const token = await getAccessToken(code, codeVerifier);
            localStorage.removeItem('spotify_code_verifier');
            if (token) {
                window.history.pushState({}, '', SPOTIFY_REDIRECT_URI);
                await enterMainApp(false);
            } else {
                if (landingPage) landingPage.style.display = 'block';
                if (mainAppContent) mainAppContent.style.display = 'none';
                updateLoginUI();
            }
        }
    }

    async function refreshSpotifyToken() {
        const refreshToken = localStorage.getItem('spotify_refresh_token');
        if (!refreshToken) {
            clearSpotifyDataAndLogout();
            return null;
        }
        const payload = {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
                client_id: SPOTIFY_CLIENT_ID
            })
        };
        try {
            const response = await fetch('https://accounts.spotify.com/api/token', payload);
            if (!response.ok) {
                const d = await response.json().catch(() => ({ error: response.statusText, error_description: "Nie udało się odczytać błędu serwera." }));
                alert(`Sesja wygasła (${d.error||response.status}). Zaloguj się ponownie.`);
                clearSpotifyDataAndLogout();
                throw new Error(d.error_description || d.error || `HTTP ${response.status}`);
            }
            const data = await response.json();
            localStorage.setItem('spotify_access_token', data.access_token);
            if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
            appState.accessToken = data.access_token;
            spotifyApi.setAccessToken(appState.accessToken);
            return data.access_token;
        } catch (e) {
            if (!appState.demoMode) clearSpotifyDataAndLogout();
            return null;
        }
    }

    function clearSpotifyDataAndLogout() {
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_refresh_token');
        localStorage.removeItem('spotify_code_verifier');
        appState.accessToken = null;
        appState.demoMode = true;
        appState.selectedPlaylist = null;
        appState.tracksWithFeatures = [];
        appState.currentMoodFilter = 'all';
        spotifyApi.setAccessToken(null);
        updateLoginUI();
    }

    function logoutUser() {
        clearSpotifyDataAndLogout();
        appState.appInitialized = false;
        enterMainApp(true);
    }

    function updateLoginUI() {
        if (appState.accessToken && !appState.demoMode) {
            if (demoModeIndicator) demoModeIndicator.style.display = 'none';
            if (userInfoEl) userInfoEl.style.display = 'flex';
            if (loginButtonsContainer) loginButtonsContainer.style.display = 'none';
            if (logoutButton) logoutButton.style.display = 'inline-block';
        } else {
            if (demoModeIndicator) demoModeIndicator.style.display = appState.demoMode ? 'block' : 'none';
            if (appState.demoMode && demoModeIndicator) demoModeIndicator.textContent = "Tryb Demonstracyjny Aktywny";
            if (userInfoEl) userInfoEl.style.display = 'none';
            if (loginButtonsContainer) loginButtonsContainer.style.display = 'flex';
            if (logoutButton) logoutButton.style.display = 'none';
        }
    }

    async function enterMainApp(startInDemoMode = true) {
        const previousModeWasDemo = appState.demoMode;
        appState.demoMode = startInDemoMode;
        if (landingPage) landingPage.style.display = "none";
        if (mainAppContent) mainAppContent.style.display = "block";
        updateLoginUI();

        if (!appState.appInitialized || previousModeWasDemo !== appState.demoMode) {
            await initializeAppCoreLogic();
            appState.appInitialized = true;
        } else {
            const activeViewExists = appState.currentView && document.getElementById(appState.currentView) && document.getElementById(appState.currentView).classList.contains('view');
            if (appState.currentView === 'landingPage' || !activeViewExists) {
                switchView('playlistsView');
            } else {
                switchView(appState.currentView);
            }
        }
        appState.previousDemoMode = appState.demoMode;
    }

    async function initializeAppCoreLogic() {
        loadSettingsFromLocalStorage();
        if (appState.demoMode) {
            if (demoModeIndicator) demoModeIndicator.style.display = 'block';
            await loadAndDisplayMockPlaylists();
        } else {
            if (demoModeIndicator) demoModeIndicator.style.display = 'none';
            if (appState.accessToken) {
                const userProfile = await fetchProfile();
                if (userProfile) {
                    displayUserProfile(userProfile);
                    await loadAndDisplaySpotifyPlaylists();
                }
            } else {
                clearSpotifyDataAndLogout();
                await enterMainApp(true);
                return;
            }
        }
        const targetView = appState.currentView && document.getElementById(appState.currentView) && document.getElementById(appState.currentView).classList.contains('view') ? appState.currentView : 'playlistsView';
        switchView(targetView);
    }

    function switchView(viewId) {
        if (!viewId || !document.getElementById(viewId)) {
            viewId = 'playlistsView';
        }
        appState.currentView = viewId;

        if (views) views.forEach(view => { if (view) view.style.display = view.id === viewId ? 'block' : 'none'; });
        if (navButtons) navButtons.forEach(button => { if (button) button.classList.toggle('active', button.dataset.section === viewId); });

        const recControlsContainer = document.getElementById('recommendationControlsContainer');

        if (viewId === 'tracksView') {
            if (playlistsView) playlistsView.style.display = 'none';
            if (recommendationsView) recommendationsView.style.display = 'none';
            if (appState.demoMode) {
                if (moodFilterControls) moodFilterControls.style.display = 'block';
                if (recControlsContainer) recControlsContainer.remove();
            } else {
                if (moodFilterControls) moodFilterControls.style.display = 'none';
            }
        } else {
            if (moodFilterControls && viewId !== 'tracksView') moodFilterControls.style.display = 'none';
            if (recControlsContainer && viewId !== 'tracksView' && recControlsContainer.parentElement) {
                recControlsContainer.remove();
            }
        }

        if (viewId === 'aboutView') loadAboutInfo();
        if (viewId === 'userStatsView') {
            if (!appState.demoMode && appState.accessToken) {
                loadAndRenderUserStats();
            } else if (userStatsView) {
                userStatsView.innerHTML = "<h2>Moje Statystyki Spotify</h2><p>Ta funkcja jest dostępna tylko po zalogowaniu do Spotify.</p>";
            }
        }
    }

    if (enterAppButton) enterAppButton.addEventListener('click', () => enterMainApp(true));
    if (navButtons) navButtons.forEach(button => {
        if (button) button.addEventListener('click', (e) => {
            const targetSection = e.target.dataset.section;
            if (targetSection) switchView(targetSection);
        });
    });
    
    if (logoutButton) logoutButton.addEventListener('click', logoutUser);
    if (backToPlaylistsButton) backToPlaylistsButton.addEventListener('click', () => {
        appState.selectedPlaylist = null;
        appState.tracksWithFeatures = [];
        if (trackListContainer) trackListContainer.innerHTML = '';
        const recControls = document.getElementById('recommendationControlsContainer');
        if (recControls) recControls.remove();
        switchView('playlistsView');
    });
    if (backToPlaylistTracksButton) {
        backToPlaylistTracksButton.addEventListener('click', () => {
            if (appState.selectedPlaylist && appState.selectedPlaylist.id && !appState.demoMode) {
                displaySpotifyPlaylistTracks(appState.selectedPlaylist.id, appState.selectedPlaylist.name);
                switchView('tracksView');
            } else if (appState.demoMode && appState.selectedPlaylist) {
                loadAndDisplayMockTracksForPlaylist(appState.selectedPlaylist);
                switchView('tracksView');
            } else {
                switchView('playlistsView');
            }
        });
    }
    if (moodFilterButtons) moodFilterButtons.forEach(button => button.addEventListener('click', (e) => {
        if (!appState.demoMode) return;
        const key = e.target.dataset.mood;
        moodFilterButtons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        appState.currentMoodFilter = key === 'all' ? 'all' : key;
        filterAndRenderTracks();
    }));

    async function fetchProfile() {
        if (!appState.accessToken) return null;
        try {
            const profileData = await spotifyApi.getMe();
            return profileData;
        } catch (error) {
            if (error && (error.status === 401 || error.status === 403)) {
                const newAccessToken = await refreshSpotifyToken();
                if (newAccessToken) return await fetchProfile();
            } else {
                alert(`Nie udało się pobrać profilu: ${error.message || 'Nieznany błąd API'}`);
                clearSpotifyDataAndLogout();
            }
            return null;
        }
    }

    function displayUserProfile(profile) {
        if (profile && userNameEl && userAvatarEl) {
            userNameEl.textContent = profile.display_name || profile.id;
            userAvatarEl.src = profile.images && profile.images.length > 0 ? profile.images[0].url : 'https://via.placeholder.com/40';
            userAvatarEl.alt = profile.display_name || 'Avatar';
        }
    }

    async function loadAndDisplaySpotifyPlaylists() {
        if (!playlistListContainer) return;
        playlistListContainer.innerHTML = '<p>Ładowanie Twoich playlist ze Spotify...</p>';
        if (!appState.accessToken) {
            clearSpotifyDataAndLogout();
            return;
        }
        try {
            const data = await spotifyApi.getUserPlaylists({ limit: 50 });
            if (data && data.items) {
                appState.playlists = data.items;
                renderPlaylists(appState.playlists);
            } else {
                playlistListContainer.innerHTML = '<p>Nie udało się załadować playlist lub są puste.</p>';
            }
        } catch (error) {
            if (error && (error.status === 401 || error.status === 403)) {
                const newAccessToken = await refreshSpotifyToken();
                if (newAccessToken) await loadAndDisplaySpotifyPlaylists();
            } else {
                playlistListContainer.innerHTML = `<p>Błąd ładowania playlist: ${error.message || 'Nieznany błąd'}</p>`;
            }
        }
    }

    async function displaySpotifyPlaylistTracks(playlistId, playlistName) {
        if (currentPlaylistNameEl) currentPlaylistNameEl.textContent = `Utwory z: ${playlistName} (kliknij, by znaleźć podobne)`;
        appState.selectedPlaylist = { id: playlistId, name: playlistName };
        if (trackListContainer) trackListContainer.innerHTML = '<p>Ładowanie utworów ze Spotify...</p>';
        if (moodFilterControls) moodFilterControls.style.display = 'none';
        const recControls = document.getElementById('recommendationControlsContainer');
        if (recControls) recControls.remove();
        if (!appState.accessToken) {
            clearSpotifyDataAndLogout();
            return;
        }
        try {
            const tracksData = await spotifyApi.getPlaylistTracks(playlistId, { limit: 50, fields: 'items(track(id,name,artists(name),album(images)))' });
            if (!tracksData || !tracksData.items || tracksData.items.length === 0) {
                if (trackListContainer) trackListContainer.innerHTML = '<li>Ta playlista jest pusta.</li>';
                return;
            }
            const tracksFromPlaylist = tracksData.items.filter(item => item.track).map(item => item.track);
            if (trackListContainer) trackListContainer.innerHTML = '';
            tracksFromPlaylist.forEach(track => {
                const li = document.createElement('li');
                li.style.cursor = 'pointer';
                const img = document.createElement('img');
                img.src = track.album.images && track.album.images.length > 0 ? track.album.images[0].url : 'https://via.placeholder.com/40';
                img.alt = track.name;
                img.style.width = '40px';
                img.style.height = '40px';
                img.style.marginRight = '10px';
                img.style.borderRadius = '4px';
                const trackInfo = document.createElement('span');
                trackInfo.innerHTML = `${track.name} - <i>${(track.artists || []).map(a => a.name).join(', ')}</i>`;
                li.appendChild(img);
                li.appendChild(trackInfo);
                li.addEventListener('click', async () => {
                    if (!track.artists || track.artists.length === 0) {
                        alert("Brak informacji o artyście dla tego utworu.");
                        return;
                    }
                    if (recommendationListContainer) recommendationListContainer.innerHTML = "<p>Wyszukiwanie podobnych utworów na Last.fm...</p>";
                    else return;
                    switchView('recommendationsView');
                    const similarTracks = await fetchSimilarTracksFromLastFM(track.artists[0].name, track.name);
                    if (similarTracks && similarTracks.length > 0) renderSimilarLastFMTracksForDisplay(similarTracks);
                    else if (similarTracks) {
                        if (recommendationListContainer) recommendationListContainer.innerHTML = "<p>Nie znaleziono podobnych utworów na Last.fm dla tego wykonawcy i tytułu.</p>";
                    } else {
                        if (recommendationListContainer) recommendationListContainer.innerHTML = "<p>Wystąpił błąd podczas wyszukiwania podobnych utworów.</p>";
                    }
                });
                if (trackListContainer) trackListContainer.appendChild(li);
            });
        } catch (error) {
            if (error && (error.status === 401 || error.status === 403)) {
                const newAccessToken = await refreshSpotifyToken();
                if (newAccessToken) await displaySpotifyPlaylistTracks(playlistId, playlistName);
            } else {
                if (trackListContainer) trackListContainer.innerHTML = `<p>Błąd ładowania utworów: ${error.message || 'Nieznany błąd'}</p>`;
            }
        }
    }

    async function fetchMockData(fileNameWithoutExtension) {
        try {
            const r = await fetch(`data/${fileNameWithoutExtension}.json`);
            if (!r.ok) throw new Error(`Nie udało się pobrać ${fileNameWithoutExtension}.json: ${r.statusText}`);
            return await r.json();
        } catch (e) {
            return null;
        }
    }

    async function loadAndDisplayMockPlaylists() {
        if (!playlistListContainer) return;
        playlistListContainer.innerHTML = '<p>Ładowanie playlist (demo)...</p>';
        const data = await fetchMockData('mock_playlist');
        if (data && data.items) {
            appState.playlists = data.items;
            renderPlaylists(appState.playlists);
        } else {
            playlistListContainer.innerHTML = '<p>Nie udało się załadować playlist demo.</p>';
        }
    }

    async function loadAndDisplayMockTracksForPlaylist(playlistFromMock) {
        appState.selectedPlaylist = playlistFromMock;
        if (currentPlaylistNameEl) currentPlaylistNameEl.textContent = playlistFromMock.name;
        if (trackListContainer) trackListContainer.innerHTML = '<p>Ładowanie utworów (demo)...</p>';
        if (moodFilterControls) moodFilterControls.style.display = 'block';
        const recControls = document.getElementById('recommendationControlsContainer');
        if (recControls) recControls.style.display = 'none';

        const tracksFile = playlistFromMock.tracks_data_file?.replace('.json', '');
        const featuresFile = playlistFromMock.audio_features_file?.replace('.json', '');

        if (!tracksFile || !featuresFile) {
            if (trackListContainer) trackListContainer.innerHTML = "<p>Błąd konfiguracji plików mock.</p>";
            appState.tracksWithFeatures = [];
            filterAndRenderTracks();
            return;
        }

        const tracksData = await fetchMockData(tracksFile);
        const featuresData = await fetchMockData(featuresFile);

        if (!tracksData || !featuresData) {
            if (trackListContainer) trackListContainer.innerHTML = '<p>Nie udało się załadować danych mock.</p>';
            appState.tracksWithFeatures = [];
            filterAndRenderTracks();
            return;
        }

        if (tracksData.items && featuresData.audio_features) {
            appState.tracksWithFeatures = tracksData.items.map(item => {
                const feature = featuresData.audio_features.find(f => f && f.id === item.track.id);
                return { track: { ...item.track, ...(feature || {}) } };
            });
            appState.currentMoodFilter = 'all';
            if (moodFilterButtons) moodFilterButtons.forEach(btn => btn.classList.remove('active'));
            const allMoodBtn = document.querySelector('#mood-filter-controls button[data-mood="all"]');
            if (allMoodBtn) allMoodBtn.classList.add('active');
            filterAndRenderTracks();
        } else {
            if (trackListContainer) trackListContainer.innerHTML = "<p>Niekompletne dane w plikach mock.</p>";
            appState.tracksWithFeatures = [];
            filterAndRenderTracks();
        }
    }

    async function fetchSimilarTracksFromLastFM(artistName, trackName) {
        if (!LASTFM_API_KEY || LASTFM_API_KEY === 'UZUPEŁNIJ_SWÓJ_KLUCZ_API_LASTFM') {
            alert("Funkcja podobnych utworów jest niedostępna (brak konfiguracji API Last.fm).");
            if (recommendationListContainer) recommendationListContainer.innerHTML = "<p>Funkcja podobnych utworów jest nieskonfigurowana.</p>";
            return null;
        }
        const params = new URLSearchParams({
            method: 'track.getSimilar',
            artist: artistName,
            track: trackName,
            api_key: LASTFM_API_KEY,
            format: 'json',
            limit: (appState.settings && appState.settings.recommendationLimit) || 15,
            autocorrect: 1
        });
        const requestUrl = `${LASTFM_API_BASE_URL}?${params.toString()}`;
        try {
            const response = await fetch(requestUrl);
            const rClone = response.clone();
            if (!response.ok) {
                const eT = await rClone.text();
                throw new Error(`Błąd Last.fm: ${response.statusText||'Nieznany'} - ${eT.substring(0,100)}`);
            }
            const data = await response.json();
            if (data.error) {
                throw new Error(`Błąd Last.fm: ${data.message}`);
            }
            if (data.similartracks && data.similartracks.track) {
                const tracks = Array.isArray(data.similartracks.track) ? data.similartracks.track : [data.similartracks.track];
                return tracks.filter(t => t && t.name && t.artist);
            } else {
                return [];
            }
        } catch (e) {
            return null;
        }
    }

    function renderSimilarLastFMTracksForDisplay(lastfmTracks) {
        if (!recommendationListContainer) return;
        recommendationListContainer.innerHTML = '';
        if (!lastfmTracks || lastfmTracks.length === 0) {
            recommendationListContainer.innerHTML = '<li>Brak podobnych utworów.</li>';
            return;
        }
        const addBtn = document.getElementById('addSelectedToPlaylistButton');
        if (addBtn) addBtn.style.display = 'none';
        const refreshBtn = document.getElementById('refreshRecommendationsButton');
        if (refreshBtn) refreshBtn.style.display = 'none';

        lastfmTracks.forEach(track => {
            const li = document.createElement('li');
            const trackInfo = document.createElement('span');
            let matchPerc = "";
            if (track.match && !isNaN(parseFloat(track.match))) {
                matchPerc = ` (Podob.: ${(parseFloat(track.match)*100).toFixed(0)}%)`;
            }
            trackInfo.innerHTML = `${track.name} - <i>${track.artist.name}</i>${matchPerc}`;
            li.appendChild(trackInfo);
            recommendationListContainer.appendChild(li);
        });
    }

    function renderPlaylists(playlistsArray) {
        if (!playlistListContainer) return;
        playlistListContainer.innerHTML = '';
        if (!playlistsArray || playlistsArray.length === 0) {
            playlistListContainer.innerHTML = '<li>Brak playlist.</li>';
            return;
        }
        playlistsArray.forEach(playlist => {
            const li = document.createElement('li');
            const img = document.createElement('img');
            img.src = playlist.images && playlist.images.length > 0 ? playlist.images[0].url : 'https://via.placeholder.com/50';
            img.alt = playlist.name;
            img.style.width = '50px';
            img.style.height = '50px';
            img.style.marginRight = '10px';
            img.style.borderRadius = '4px';
            const span = document.createElement('span');
            span.textContent = playlist.name;
            li.appendChild(img);
            li.appendChild(span);
            li.addEventListener('click', async () => {
                if (appState.demoMode) await loadAndDisplayMockTracksForPlaylist(playlist);
                else await displaySpotifyPlaylistTracks(playlist.id, playlist.name);
                switchView('tracksView');
            });
            playlistListContainer.appendChild(li);
        });
    }

    function renderTracks(tracksToRender) {
        if (!trackListContainer) return;
        trackListContainer.innerHTML = '';
        if (!tracksToRender || tracksToRender.length === 0) {
            trackListContainer.innerHTML = '<li>Brak utworów do wyświetlenia dla tego filtra.</li>';
            return;
        }
        tracksToRender.forEach(trackObject => {
            const li = document.createElement('li');
            li.classList.add('track-item');
            const mood = determineMood(trackObject);

            const trackInfoDiv = document.createElement('div');
            trackInfoDiv.classList.add('track-info-clickable');
            trackInfoDiv.style.display = 'flex';
            trackInfoDiv.style.width = '100%';
            trackInfoDiv.style.alignItems = 'center';
            trackInfoDiv.innerHTML = `<span>${trackObject.track.name} - <i>${(trackObject.track.artists || []).map(a => a.name).join(', ')}</i></span><span class="mood-indicator ${mood.class}">${mood.label}</span>`;
            li.appendChild(trackInfoDiv);

            const detailsOuterDiv = document.createElement('div');
            detailsOuterDiv.classList.add('track-item-details');
            detailsOuterDiv.style.display = 'none';

            const chartContainerDiv = document.createElement('div');
            chartContainerDiv.classList.add('track-feature-chart-container');
            let chartHTML = '<p><strong>Charakterystyka Utworu:</strong></p>';
            const featuresToChart = [
                { label: 'Energia', valueKey: 'energy', class: 'energy' },
                { label: 'Taneczność', valueKey: 'danceability', class: 'danceability' },
                { label: 'Pozytywność', valueKey: 'valence', class: 'valence' },
                { label: 'Akustyczność', valueKey: 'acousticness', class: 'acousticness' },
                { label: 'Instrumentalność', valueKey: 'instrumentalness', class: 'instrumentalness-bar-color' }
            ];

            if (trackObject.track && featuresToChart.some(f => typeof trackObject.track[f.valueKey] === 'number')) {
                featuresToChart.forEach(feature => {
                    const val = typeof trackObject.track[feature.valueKey] === 'number' ? trackObject.track[feature.valueKey] : 0;
                    chartHTML += `<div class="feature-bar-item"><span class="feature-bar-label">${feature.label} (${(val*100).toFixed(0)}%)</span><div class="feature-bar-wrapper"><div class="feature-bar-value ${feature.class}" style="width: ${val*100}%;"></div></div></div>`;
                });
            } else {
                chartHTML += "<p>Brak danych do wizualizacji.</p>";
            }
            chartContainerDiv.innerHTML = chartHTML;
            detailsOuterDiv.appendChild(chartContainerDiv);
            li.appendChild(detailsOuterDiv);

            trackInfoDiv.addEventListener('click', () => {
                document.querySelectorAll('#track-list-container .track-item-details').forEach(od => {
                    if (od !== detailsOuterDiv) {
                        od.style.display = 'none';
                        od.closest('.track-item')?.classList.remove('active-track-details');
                    }
                });
                const vis = detailsOuterDiv.style.display !== 'none';
                detailsOuterDiv.style.display = vis ? 'none' : 'block';
                li.classList.toggle('active-track-details', !vis);
            });
            trackListContainer.appendChild(li);
        });
    }

    function determineMood(trackObject) {
        if (!trackObject || !trackObject.track) return { label: 'Błąd Danych', class: 'mood-neutral', key: 'neutral' };
        const f = trackObject.track;
        if (f.energy > 0.75 && f.danceability > 0.7 && f.valence > 0.5 && (f.tempo === undefined || f.tempo === 0 || f.tempo > 120)) return { label: 'Energetyczny', class: 'mood-energetic', key: 'energetic' };
        if (f.valence > 0.7 && (f.energy >= 0.5 && f.energy <= 0.85) && f.danceability > 0.5 && f.mode === 1) return { label: 'Radosny', class: 'mood-positive', key: 'happy' };
        if (f.valence < 0.3 && f.energy < 0.5 && f.danceability < 0.5) return { label: 'Smutny', class: 'mood-sad', key: 'sad' };
        if (f.energy < 0.4 && f.danceability < 0.45 && (f.valence >= 0.3 && f.valence <= 0.6) && (f.tempo === undefined || f.tempo === 0 || f.tempo < 110)) return { label: 'Relaksujący', class: 'mood-chill', key: 'relax' };
        if (f.energy > 0.7 && typeof f.loudness === 'number' && f.loudness > -7 && f.danceability < 0.6) return { label: 'Intensywny', class: 'mood-intense', key: 'intense' };
        if (typeof f.instrumentalness === 'number' && f.instrumentalness > 0.6 && typeof f.speechiness === 'number' && f.speechiness < 0.3 && (f.energy >= 0.2 && f.energy <= 0.5) && (f.valence >= 0.4 && f.valence <= 0.7) && (f.tempo === undefined || f.tempo === 0 || (f.tempo >= 70 && f.tempo <= 120))) return { label: 'Do Skupienia', class: 'mood-focus', key: 'focus' };
        return { label: 'Neutralny', class: 'mood-neutral', key: 'neutral' };
    }

    function filterAndRenderTracks() {
        if (appState.demoMode) {
            const toRender = appState.tracksWithFeatures.filter(to => {
                if (appState.currentMoodFilter === null || appState.currentMoodFilter === 'all') return true;
                return determineMood(to).key === appState.currentMoodFilter;
            });
            renderTracks(toRender);
        }
    }

    async function fetchUserTopArtists() {
        if (!appState.accessToken || appState.demoMode) return null;
        try {
            const d = await spotifyApi.getMyTopArtists({ limit: 5, time_range: 'medium_term' });
            return d.items;
        } catch (e) {
            if (e && (e.status === 401 || e.status === 403)) {
                const n = await refreshSpotifyToken();
                if (n) return await fetchUserTopArtists();
            }
            return null;
        }
    }
    async function fetchUserTopTracks() {
        if (!appState.accessToken || appState.demoMode) return null;
        try {
            const d = await spotifyApi.getMyTopTracks({ limit: 10, time_range: 'medium_term' });
            return d.items;
        } catch (e) {
            if (e && (e.status === 401 || e.status === 403)) {
                const n = await refreshSpotifyToken();
                if (n) return await fetchUserTopTracks();
            }
            return null;
        }
    }
    async function fetchUserRecentlyPlayed() {
        if (!appState.accessToken || appState.demoMode) return null;
        try {
            const d = await spotifyApi.getMyRecentlyPlayedTracks({ limit: 15 });
            return d.items;
        } catch (e) {
            if (e && (e.status === 401 || e.status === 403)) {
                const n = await refreshSpotifyToken();
                if (n) return await fetchUserRecentlyPlayed();
            }
            return null;
        }
    }

    function renderTopArtists(a) {
        if (!topArtistsListEl) return;
        topArtistsListEl.innerHTML = '';
        if (!a || a.length === 0) {
            topArtistsListEl.innerHTML = '<li>Brak danych o top artystach.</li>';
            return;
        }
        a.forEach((art, i) => {
            const li = document.createElement('li');
            const img = art.images && art.images.length > 0 ? `<img src="${art.images[art.images.length-1].url}" alt="${art.name}" style="width:40px;height:40px;margin-right:10px;border-radius:50%;">` : '';
            li.innerHTML = `${i+1}. ${img} ${art.name} <span style="font-size:0.8em;color:#777;">(Popularność: ${art.popularity})</span>`;
            topArtistsListEl.appendChild(li);
        });
    }

    function renderTopTracks(t) {
        if (!topTracksListEl) return;
        topTracksListEl.innerHTML = '';
        if (!t || t.length === 0) {
            topTracksListEl.innerHTML = '<li>Brak danych o top utworach.</li>';
            return;
        }
        t.forEach((trk, i) => {
            const li = document.createElement('li');
            const img = trk.album.images && trk.album.images.length > 0 ? `<img src="${trk.album.images[trk.album.images.length-1].url}" alt="${trk.album.name}" style="width:40px;height:40px;margin-right:10px;border-radius:4px;">` : '';
            li.innerHTML = `${i+1}. ${img} ${trk.name} - <i>${(trk.artists||[]).map(a=>a.name).join(', ')}</i>`;
            topTracksListEl.appendChild(li);
        });
    }

    function renderRecentlyPlayed(p) {
        if (!recentlyPlayedListEl) return;
        recentlyPlayedListEl.innerHTML = '';
        if (!p || p.length === 0) {
            recentlyPlayedListEl.innerHTML = '<li>Brak danych o ostatnio odtwarzanych.</li>';
            return;
        }
        p.forEach(hItem => {
            const trk = hItem.track;
            if (!trk) return;
            const li = document.createElement('li');
            const img = trk.album.images && trk.album.images.length > 0 ? `<img src="${trk.album.images[trk.album.images.length-1].url}" alt="${trk.album.name}" style="width:40px;height:40px;margin-right:10px;border-radius:4px;">` : '';
            const pAt = new Date(hItem.played_at).toLocaleString('pl-PL');
            li.innerHTML = `${img} ${trk.name} - <i>${(trk.artists||[]).map(a=>a.name).join(', ')}</i> <span style="font-size:0.8em; color: #777; margin-left: auto;">(${pAt})</span>`;
            recentlyPlayedListEl.appendChild(li);
        });
    }

    async function loadAndRenderUserStats() {
        const currentStatsView = document.getElementById('userStatsView');
        if (!currentStatsView) return;
        if (topArtistsListEl) topArtistsListEl.innerHTML = '<li>Ładowanie...</li>';
        if (topTracksListEl) topTracksListEl.innerHTML = '<li>Ładowanie...</li>';
        if (recentlyPlayedListEl) recentlyPlayedListEl.innerHTML = '<li>Ładowanie...</li>';
        const r = await Promise.allSettled([fetchUserTopArtists(), fetchUserTopTracks(), fetchUserRecentlyPlayed()]);
        renderTopArtists(r[0].status === 'fulfilled' ? r[0].value : null);
        renderTopTracks(r[1].status === 'fulfilled' ? r[1].value : null);
        renderRecentlyPlayed(r[2].status === 'fulfilled' ? r[2].value : null);
    }

    function loadSettingsFromLocalStorage() {
        const s = localStorage.getItem('userAppSettings');
        if (s && appSettingsForm) {
            try {
                const sets = JSON.parse(s);
                Object.keys(sets).forEach(k => {
                    const el = appSettingsForm.elements[k];
                    if (el) {
                        if (el.type === 'radio') {
                            const r = appSettingsForm.querySelector(`input[name="${k}"][value="${sets[k]}"]`);
                            if (r) r.checked = true;
                        } else if (el.type === 'checkbox') {
                            el.checked = sets[k] === 'on';
                        } else {
                            el.value = sets[k];
                        }
                    }
                });
                if (sets.accentColor) {
                    document.documentElement.style.setProperty('--primary-color', sets.accentColor);
                    if (accentColorInput) accentColorInput.value = sets.accentColor;
                }
                const formUserN = appSettingsForm.elements.userName;
                if (formUserN && sets.userName) formUserN.value = sets.userName;
                const recLimit = appSettingsForm.elements.recommendationLimit;
                if (recLimit && sets.recommendationLimit) recLimit.value = sets.recommendationLimit;
                const fontSizeEl = appSettingsForm.elements.fontSize;
                if (fontSizeEl && sets.fontSize) {
                    fontSizeEl.value = sets.fontSize;
                    document.body.style.fontSize = sets.fontSize === 'small' ? '0.9em' : sets.fontSize === 'large' ? '1.1em' : '1em';
                }
            } catch (e) {}
        }
        const theme = localStorage.getItem('theme');
        const darkThemeRadio = document.getElementById('themeDark');
        const lightThemeRadio = document.getElementById('themeLight');
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            if (darkThemeRadio && appSettingsForm && appSettingsForm.elements.theme) darkThemeRadio.checked = true;
        } else {
            document.body.classList.remove('dark-theme');
            if (lightThemeRadio && appSettingsForm && appSettingsForm.elements.theme) lightThemeRadio.checked = true;
        }
    }

    if (appSettingsForm) appSettingsForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (appSettingsFeedbackEl) {
            appSettingsFeedbackEl.textContent = '';
            appSettingsFeedbackEl.className = 'feedback-message';
        }
        let valid = true;
        const formUserN = appSettingsForm.elements.userName;
        if (formUserN) valid = validateField(formUserN, v => v.trim().length >= 3 && /^[a-zA-Z0-9\s]+$/.test(v), 'Nazwa: min 3 znaki (litery,cyfry,spacje).') && valid;
        const recLimit = appSettingsForm.elements.recommendationLimit;
        if (recLimit) valid = validateField(recLimit, v => { const n = parseInt(v, 10); return !isNaN(n) && n >= 5 && n <= 30; }, 'Liczba od 5 do 30.') && valid;

        if (valid) {
            const fd = new FormData(appSettingsForm);
            const d = Object.fromEntries(fd.entries());
            localStorage.setItem('userAppSettings', JSON.stringify(d));
            if (appSettingsFeedbackEl) {
                appSettingsFeedbackEl.textContent = 'Ustawienia zapisane!';
                appSettingsFeedbackEl.classList.add('success');
            }
            if (d.accentColor) document.documentElement.style.setProperty('--primary-color', d.accentColor);
            if (d.theme === 'dark') {
                document.body.classList.add('dark-theme');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-theme');
                localStorage.setItem('theme', 'light');
            }
            if (d.fontSize) document.body.style.fontSize = d.fontSize === 'small' ? '0.9em' : d.fontSize === 'large' ? '1.1em' : '1em';
        } else {
            if (appSettingsFeedbackEl) {
                appSettingsFeedbackEl.textContent = 'Popraw błędy.';
                appSettingsFeedbackEl.classList.add('error');
            }
        }
    });

    if (resetAppSettingsButton && appSettingsForm) resetAppSettingsButton.addEventListener('click', () => {
        appSettingsForm.reset();
        appSettingsForm.querySelectorAll('.validation-message').forEach(s => s.textContent = '');
        appSettingsForm.querySelectorAll('input,select,textarea').forEach(el => el.classList.remove('input-invalid'));
        if (appSettingsFeedbackEl) appSettingsFeedbackEl.textContent = '';
        document.documentElement.style.setProperty('--primary-color', '#1DB954');
        document.body.classList.remove('dark-theme');
        localStorage.setItem('theme', 'light');
        const lr = document.getElementById('themeLight');
        if (lr && appSettingsForm.elements.theme) lr.checked = true;
        const ac = document.getElementById('accentColor');
        if (ac) ac.value = "#1DB954";
        const fs = document.getElementById('fontSize');
        if (fs) fs.value = "medium";
        document.body.style.fontSize = '1em';
    });

    if (contactMessageForm) contactMessageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        if (contactFormFeedbackEl) {
            contactFormFeedbackEl.textContent = '';
            contactFormFeedbackEl.className = 'feedback-message';
        }
        let valid = true;
        valid = validateField(contactEmailInput, v => v.trim() !== "" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Podaj poprawny e-mail.') && valid;
        valid = validateField(messageSubjectSelect, v => v !== "", 'Wybierz temat.') && valid;
        if (messageSubjectSelect.value === 'other') {
            valid = validateField(otherSubjectText, v => v.trim() !== "", 'Opisz inny temat.') && valid;
        }
        valid = validateField(userMessageTextarea, v => v.trim().length >= 10 && v.trim().length <= 1000, 'Wiadomość (10-1000 znaków).') && valid;
        valid = validateField(agreeToTermsCheckbox, v => agreeToTermsCheckbox.checked, 'Musisz zaakceptować warunki.') && valid;

        if (valid) {
            const fd = new FormData(contactMessageForm);
            const d = Object.fromEntries(fd.entries());
            if (contactFormFeedbackEl) {
                contactFormFeedbackEl.textContent = 'Wiadomość "wysłana"! (To tylko symulacja)';
                contactFormFeedbackEl.classList.add('success');
            }
            contactMessageForm.reset();
            if (charCountEl) charCountEl.textContent = '0/1000';
            if (otherSubjectContainer) otherSubjectContainer.style.display = 'none';
        } else {
            if (contactFormFeedbackEl) {
                contactFormFeedbackEl.textContent = 'Proszę poprawić błędy w formularzu.';
                contactFormFeedbackEl.classList.add('error');
            }
        }
    });

    if (resetContactFormButton && contactMessageForm) resetContactFormButton.addEventListener('click', () => {
        contactMessageForm.reset();
        contactMessageForm.querySelectorAll('.validation-message').forEach(s => s.textContent = '');
        contactMessageForm.querySelectorAll('input,select,textarea').forEach(el => el.classList.remove('input-invalid'));
        if (contactFormFeedbackEl) contactFormFeedbackEl.textContent = '';
        if (charCountEl) charCountEl.textContent = '0/1000';
        if (otherSubjectContainer) otherSubjectContainer.style.display = 'none';
    });

    if (userMessageTextarea && charCountEl) userMessageTextarea.addEventListener('input', () => {
        const l = userMessageTextarea.value.length;
        charCountEl.textContent = `${l}/1000`;
        charCountEl.style.color = l > 1000 ? 'red' : '';
    });

    if (messageSubjectSelect && otherSubjectContainer) messageSubjectSelect.addEventListener('change', function() {
        otherSubjectContainer.style.display = this.value === 'other' ? 'block' : 'none';
        if (this.value !== 'other' && otherSubjectText) {
            otherSubjectText.value = '';
            validateField(otherSubjectText, () => true, '');
        }
    });

    async function loadAboutInfo() {
        if (!aboutAppContentEl || aboutAppContentEl.dataset.loaded === 'true') return;
        aboutAppContentEl.innerHTML = "<p>Ładowanie...</p>";
        try {
            const r = await fetch('./about.html');
            if (!r.ok) throw new Error("Błąd");
            aboutAppContentEl.innerHTML = await r.text();
            aboutAppContentEl.dataset.loaded = 'true';
        } catch (e) {
            aboutAppContentEl.innerHTML = "<p>Błąd ładowania informacji.</p>";
        }
    }

    async function initialSetup() {
        const params = new URLSearchParams(window.location.search);
        if (params.has('code')) {
            await handleSpotifyCallback();
        } else {
            const storedAccessToken = localStorage.getItem('spotify_access_token');
            if (storedAccessToken) {
                appState.accessToken = storedAccessToken;
                spotifyApi.setAccessToken(appState.accessToken);
                const userProfile = await fetchProfile();
                if (userProfile) {
                    await enterMainApp(false);
                    displayUserProfile(userProfile);
                } else {
                    clearSpotifyDataAndLogout();
                    if (landingPage && mainAppContent) {
                        landingPage.style.display = 'block';
                        mainAppContent.style.display = 'none';
                    }
                    updateLoginUI();
                }
            } else {
                if (landingPage && mainAppContent) {
                    landingPage.style.display = 'block';
                    mainAppContent.style.display = 'none';
                }
                updateLoginUI();
            }
        }
    }
    initialSetup();
});