document.addEventListener('DOMContentLoaded', () => {
    let currentPlaylists = [];
    let currentTracksWithFeatures = [];
    let demoModeActive = true;

    const playlistsListEl = document.getElementById('playlistsList');
    const tracksListEl = document.getElementById('tracksList');
    const tracksSectionEl = document.getElementById('tracksSection');
    const selectedPlaylistNameEl = document.getElementById('selectedPlaylistName');
    const loginButtonEl = document.getElementById('loginButton');
    const demoModeNoticeEl = document.getElementById('demoModeNotice');
    const moodFiltersEl = document.getElementById('moodFilters');
    const settingsFormSectionEl = document.getElementById('settingsFormSection');
    const saveFormButtonEl = document.getElementById('saveFormButton');
    const formOutputEl = document.getElementById('formOutput');
    const exampleFormEl = document.getElementById('exampleForm');
    const loadAboutButtonEl = document.getElementById('loadAboutButton');
    const aboutContentEl = document.getElementById('aboutContent');

    function initializeApp() {
        if (demoModeActive) {
            demoModeNoticeEl.style.display = 'block';
            loginButtonEl.style.display = 'none';
            loadMockPlaylists();
            settingsFormSectionEl.style.display = 'block';
        } else {
            loginButtonEl.style.display = 'block';
            demoModeNoticeEl.style.display = 'none';
        }
    }

    async function loadMockData(jsonFile) {
        try {
            const response = await fetch(`./data/${jsonFile}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} for ${jsonFile}`);
            }
            return await response.json();
        } catch (error) {
            console.error("Could not load mock data:", error);
            return null;
        }
    }

    async function loadMockPlaylists() {
        const data = await loadMockData('mock_playlists.json');
        if (data && data.items) {
            currentPlaylists = data.items;
            renderPlaylists(currentPlaylists);
        }
    }

    async function loadMockTracksAndFeatures(playlist) {
        tracksSectionEl.style.display = 'block';
        selectedPlaylistNameEl.textContent = `Utwory z playlisty: ${playlist.name}`;
        tracksListEl.innerHTML = '<li>Ładowanie utworów...</li>';

        const tracksData = await loadMockData(playlist.tracks_data_file);
        const audioFeaturesData = await loadMockData(playlist.audio_features_file);

        if (tracksData && tracksData.items && audioFeaturesData && audioFeaturesData.audio_features) {
            currentTracksWithFeatures = tracksData.items.map(item => {
                const track = item.track;
                const features = audioFeaturesData.audio_features.find(f => f.id === track.id);
                return { ...track, features: features || {} };
            });
            filterAndRenderTracks('all');
        } else {
            tracksListEl.innerHTML = '<li>Nie udało się załadować utworów dla tej playlisty.</li>';
        }
    }

    function renderPlaylists(playlists) {
        playlistsListEl.innerHTML = '';
        if (!playlists || playlists.length === 0) {
            playlistsListEl.innerHTML = '<li>Brak playlist do wyświetlenia.</li>';
            return;
        }
        playlists.forEach(playlist => {
            const li = document.createElement('li');
            li.innerHTML = `
                <img src="${playlist.images[0]?.url || 'https://via.placeholder.com/40'}" alt="Okładka ${playlist.name}">
                <span>${playlist.name}</span>
            `;
            li.addEventListener('click', () => {
                document.querySelectorAll('#playlistsList li.active').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                loadMockTracksAndFeatures(playlist);
            });
            playlistsListEl.appendChild(li);
        });
    }

    function renderTracks(tracksToRender) {
        tracksListEl.innerHTML = '';
        if (!tracksToRender || tracksToRender.length === 0) {
            tracksListEl.innerHTML = '<li>Brak utworów spełniających kryteria.</li>';
            return;
        }
        tracksToRender.forEach(track => {
            const li = document.createElement('li');
            const mood = determineMood(track.features);
            li.innerHTML = `
                <span>${track.name} - <i>${track.artists.map(a => a.name).join(', ')}</i></span>
                <span class="mood-indicator ${mood.class}">${mood.label}</span>
            `;
            tracksListEl.appendChild(li);
        });
    }

    function determineMood(features) {
        if (!features || Object.keys(features).length === 0) return { label: "Brak danych", class: "mood-neutral" };

        const energy = features.energy || 0;
        const valence = features.valence || 0;
        const danceability = features.danceability || 0;

        if (energy > 0.7 && valence > 0.6 && danceability > 0.6) return { label: "Energetyczny", class: "mood-energetic" };
        if (energy < 0.4 && valence < 0.5) return { label: "Relaksujący", class: "mood-chill" };
        if (valence > 0.7) return { label: "Pozytywny", class: "mood-positive" };
        return { label: "Neutralny", class: "mood-neutral" };
    }

    function filterAndRenderTracks(moodType) {
        document.querySelectorAll('#moodFilters button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`#moodFilters button[data-mood="${moodType}"]`).classList.add('active');

        if (moodType === 'all') {
            renderTracks(currentTracksWithFeatures);
            return;
        }
        const filteredTracks = currentTracksWithFeatures.filter(track => {
            const mood = determineMood(track.features);
            if (moodType === 'energetic') return mood.class === 'mood-energetic';
            if (moodType === 'chill') return mood.class === 'mood-chill';
            if (moodType === 'positive') return mood.class === 'mood-positive';
            return false;
        });
        renderTracks(filteredTracks);
    }

    function handleFormSubmit() {
        const formData = new FormData(exampleFormEl);
        const data = Object.fromEntries(formData.entries());

        if (!data.userName || data.userName.trim() === "") {
            alert("Nazwa użytkownika nie może być pusta!");
            return;
        }

        if (data.saveSettings) {
            localStorage.setItem('userDemoSettings', JSON.stringify(data));
            formOutputEl.textContent = 'Ustawienia zapisane w localStorage! (Odśwież stronę, aby zobaczyć, czy zostały wczytane - nie zaimplementowano wczytywania w tym demo).';
        } else {
            localStorage.removeItem('userDemoSettings');
            formOutputEl.textContent = 'Ustawienia nie zostały zapisane (opcja odznaczona). Dane formularza: ' + JSON.stringify(data);
        }
        console.log("Dane formularza:", data);
    }

    function loadSettingsFromLocalStorage() {
        const savedSettings = localStorage.getItem('userDemoSettings');
        if (savedSettings) {
            console.log("Wczytano ustawienia z localStorage:", JSON.parse(savedSettings));
        }
    }

    async function loadAboutContent() {
        try {
            const response = await fetch('./about.html');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const htmlContent = await response.text();
            aboutContentEl.innerHTML = htmlContent;
            aboutContentEl.style.display = 'block';
        } catch (error) {
            console.error("Could not load about content:", error);
            aboutContentEl.innerHTML = '<p>Nie udało się załadować informacji o aplikacji.</p>';
            aboutContentEl.style.display = 'block';
        }
    }

    moodFiltersEl.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON') {
            const moodType = event.target.dataset.mood;
            filterAndRenderTracks(moodType);
        }
    });

    if (saveFormButtonEl) {
        saveFormButtonEl.addEventListener('click', handleFormSubmit);
    }

    if (loadAboutButtonEl) {
        loadAboutButtonEl.addEventListener('click', loadAboutContent);
    }

    initializeApp();
    loadSettingsFromLocalStorage();
});
