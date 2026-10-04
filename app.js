const tempCache = {};
const CACHE_MS = 10 * 60 * 1000;   // 10 minutes

// ------------------- top corner icons -----------------------------
document.getElementById('refreshBtn').addEventListener('click', loadHomeWeather);
document.getElementById('settingsBtn').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    document.documentElement.classList.toggle('dark-mode');

    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('settingsBtn').textContent = isDark ? '☀' : '⚙';
});

function renderHubGreeting() {
    const hour = new Date().getHours();
    let greeting = "Hello";
    if (hour < 12) greeting = "Good morning";
    else if (hour < 17) greeting = "Good afternoon";
    else if (hour < 21) greeting = "Good evening";
    else greeting = "Good night";

    const el = document.getElementById("hubGreeting");
    const dateEl = document.getElementById("hubDate");
    if (el) el.textContent = greeting + ".";
    if (dateEl) {
        const d = new Date();
        dateEl.textContent = d.toLocaleDateString([], {
            weekday: 'long', day: 'numeric', month: 'long'
        }) + " · " + currentCity.name;
    }
}


// --------------------render daily and hourly : weather section-------------------------

function renderHourly(hourly) {
    const container = document.getElementById("hourlyScroll");
    container.innerHTML = "";

    if (!hourly || !hourly.time) return;

    const now = Date.now();
    let start = 0;
    let bestDiff = Infinity;
    hourly.time.forEach((iso, i) => {
        const diff = Math.abs(new Date(iso).getTime() - now);
        if (diff < bestDiff) { bestDiff = diff; start = i; }
    });

    const slice = hourly.time.slice(start, start + 13);

    slice.forEach((iso, i) => {
        const idx = start + i;
        const hourLabel = i === 0
            ? "Now"
            : new Date(iso).toLocaleTimeString([], { hour: 'numeric' });
        const { icon } = codeToWeather(hourly.weather_code[idx]);
        const temp = Math.round(hourly.temperature_2m[idx]);

        const card = document.createElement("div");
        card.className = "hour-card";
        card.innerHTML = `
            <p class="hour">${hourLabel}</p>
            <p class="hour-icon">${icon}</p>
            <p class="hour-temp">${temp}°</p>
        `;
        container.appendChild(card);
    });
}


function renderDaily(daily) {
    const container = document.getElementById("dailyList");
    container.innerHTML = "";

    if (!daily || !daily.time) return;

    daily.time.forEach((iso, i) => {
        const date = new Date(iso);
        const label = i === 0
            ? "Today"
            : date.toLocaleDateString([], { weekday: 'short' });

        const { icon } = codeToWeather(daily.weather_code[i]);
        const min = Math.round(daily.temperature_2m_min[i]);
        const max = Math.round(daily.temperature_2m_max[i]);

        const row = document.createElement("div");
        row.className = "day-row";
        row.innerHTML = `
            <span class="day-name">${label}</span>
            <span class="day-icon">${icon}</span>
            <span class="day-temp">${max}° / ${min}°</span>
        `;
        container.appendChild(row);
    });
}


let currentCity = {
    name: "Kasaragod",
    sub: "Kerala, India",
    lat: 12.4984,
    lng: 74.9896
};

// ------------------------------------------------

let savedLocations = JSON.parse(localStorage.getItem('wnmLocations')) || [
    { name: 'Mumbai',    sub: 'Maharashtra, India', emoji: '🌤️', latitude: 19.0760, longitude: 72.8777 },
    { name: 'Delhi',     sub: 'Delhi, India',       emoji: '☀️', latitude: 28.6139, longitude: 77.2090 },
    { name: 'Bengaluru', sub: 'Karnataka, India',   emoji: '🌧️', latitude: 12.9716, longitude: 77.5946 },
    { name: 'Tokyo',     sub: 'Japan',              emoji: '⛅', latitude: 35.6762, longitude: 139.6503 }
];

const locationList  = document.getElementById('locationList');
const locationEmpty = document.getElementById('locationEmpty');
const locationSearch = document.getElementById('locationSearch')

let activeLocation = 0;

// -----------------------------------------------------------------
function renderLocations() {
    localStorage.setItem('wnmLocations', JSON.stringify(savedLocations));
    if (!locationList) return;
    locationList.innerHTML = '';

    if (savedLocations.length === 0) {
        locationEmpty.style.display = 'block';
        return;
    }
    locationEmpty.style.display = 'none';

    savedLocations.forEach((loc, i) => {
        const card = document.createElement('div');
        card.className = 'location-card' + (i === activeLocation ? ' active' : '');
        card.innerHTML = `
            <div class="location-card-left">
                <span class="location-emoji">${loc.emoji}</span>
                <div>
                    <div class="location-name">${loc.name}</div>
                    <div class="location-sub">${loc.sub}</div>
                </div>
            </div>
            <div class="location-card-right">
                <div class="location-temp">${loc.temp || '--°'}</div>
                <div class="card-actions">
                    <button class="card-btn edit"   title="Edit">✎</button>
                    <button class="card-btn remove" title="Remove">✕</button>
                </div>
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.closest('.card-btn')) return;
            activeLocation = i;
            currentCity = {
                name: loc.name,
                sub: loc.sub,
                lat: loc.latitude,
                lng: loc.longitude
            };
            loadHomeWeather();
            renderLocations();
        });

        card.querySelector('.edit').addEventListener('click', (e) => {
            e.stopPropagation();
            startEdit(i, card);
        });

        card.querySelector('.remove').addEventListener('click', (e) => {
            e.stopPropagation();
            savedLocations.splice(i, 1);
            if (activeLocation >= savedLocations.length) {
                activeLocation = Math.max(0, savedLocations.length - 1);
            }
            renderLocations();
        });

        locationList.appendChild(card);

// --------------------live temp for this card w cache------------------------------
        if (loc.latitude && loc.longitude) {
            const key = `${loc.latitude},${loc.longitude}`;
            const hit = tempCache[key];
            const fresh = hit && (Date.now() - hit.at < CACHE_MS);

            if (fresh) {
                card.querySelector('.location-temp').textContent = hit.t + '°';
            } else {
                getWeather(loc.latitude, loc.longitude).then(data => {
                    const t = Math.round(data.current.temperature_2m);
                    tempCache[key] = { t, at: Date.now() };
                    card.querySelector('.location-temp').textContent = t + '°';
                }).catch(() => {
                    card.querySelector('.location-temp').textContent = '--°';
                });
            }
        }
    });
}

// -----------------------------------------------------------------

function startEdit(index, card) {
    const loc = savedLocations[index];
    const nameEl = card.querySelector('.location-name');
    const subEl  = card.querySelector('.location-sub');

    nameEl.innerHTML = `<input class="location-edit-input" type="text" value="${loc.name}">`;
    const nameInput = nameEl.querySelector('input');
    nameInput.focus();
    nameInput.select();

    subEl.innerHTML = `<input class="location-edit-input" type="text" value="${loc.sub}">`;
    const subInput = subEl.querySelector('input');
    function save() {
        const newName = nameInput.value.trim();
        const newSub  = subInput.value.trim();
        if (newName) loc.name = newName;
        if (newSub)  loc.sub  = newSub;
    }

    function cancel() {
        renderLocations();
    }

    nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')  save();
        if (e.key === 'Escape') cancel();
    });
    subInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter')  save();
        if (e.key === 'Escape') cancel();
    });

    nameInput.addEventListener('blur', () => setTimeout(save, 100));
}


// ---------------------------------------------api FOR WEATHER APP--------------------------------------------

async function getWeather(lat, lng) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` + `&daily=weather_code,temperature_2m_min,temperature_2m_max,precipitation_sum,sunrise,sunset` + `&hourly=temperature_2m,weather_code` + `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` + `&timezone=auto`;
    const res = await fetch(url);
    return await res.json();
}

const weatherCodes = {
    0:  { label: "Clear sky",      icon: "☀️" },
    1:  { label: "Mainly clear",   icon: "🌤️" },
    2:  { label: "Partly cloudy",  icon: "⛅" },
    3:  { label: "Overcast",       icon: "☁️" },
    45: { label: "Fog",            icon: "🌫️" },
    48: { label: "Fog",            icon: "🌫️" },
    51: { label: "Light drizzle",  icon: "🌦️" },
    53: { label: "Drizzle",        icon: "🌦️" },
    55: { label: "Heavy drizzle",  icon: "🌦️" },
    61: { label: "Light rain",     icon: "🌧️" },
    63: { label: "Rain",           icon: "🌧️" },
    65: { label: "Heavy rain",     icon: "🌧️" },
    71: { label: "Snow",           icon: "❄️" },
    80: { label: "Showers",        icon: "🌦️" },
    81: { label: "Showers",        icon: "🌦️" },
    82: { label: "Heavy showers",  icon: "🌧️" },
    95: { label: "Thunderstorm",   icon: "⛈️" },
    96: { label: "Thunderstorm",   icon: "⛈️" },
    99: { label: "Thunderstorm",   icon: "⛈️" }
};

function codeToWeather(code) {
    return weatherCodes[code] || { label: "—", icon: "🌡️" };
}

async function loadHomeWeather() {
    console.log("loading weather for:", currentCity);
    try {
        const data = await getWeather(currentCity.lat, currentCity.lng);
        const c = data.current;
        const { label, icon } = codeToWeather(c.weather_code);

        document.getElementById("homeLocation").textContent  = `${currentCity.name}, ${currentCity.sub}`;

        document.getElementById("homeTemp").textContent      = Math.round(c.temperature_2m);

        document.getElementById("homeCondition").textContent = `${icon} ${label}`;
        const tempEl = document.querySelector('.temp');
        tempEl.classList.remove('pop');
        void tempEl.offsetWidth;
        tempEl.classList.add('pop');

        document.getElementById("homeDesc").textContent      = `Currently ${label.toLowerCase()} in ${currentCity.name}.`;

        document.getElementById("homeFeels").textContent     = `Humidity ${c.relative_humidity_2m}% · Wind ${c.wind_speed_10m} km/h`;

        document.getElementById("homeWind").textContent      = `💨 ${c.wind_speed_10m} km/h`;

        document.getElementById("homeHumidity").textContent  = `💧 ${c.relative_humidity_2m}%`;

        document.getElementById("homeUpdated").textContent   = `Updated ${new Date().toLocaleTimeString()}`;

        document.getElementById("homeSunrise").textContent   = '🌅 ' + new Date(data.daily.sunrise[0]).toLocaleTimeString([], {hour:'numeric', minute:'2-digit', hour12: true});
        document.getElementById("homeSunset").textContent    = '🌇 ' + new Date(data.daily.sunset[0]).toLocaleTimeString([], {hour:'numeric', minute:'2-digit', hour12: true});

        const card = document.querySelector('.current-card');
        card.classList.remove('animate-in');
        void card.offsetWidth;
        card.classList.add('animate-in');

        renderHourly(data.hourly);
        renderDaily(data.daily);

    } catch (err) {
        console.error(err);
        document.getElementById("homeCondition").textContent = "Failed to load";
    }
}

// -----------------------------------------------------------------------------------------------

async function getCoords(city) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.results || !data.results.length) return null;
    const r = data.results[0];
    return {
        name: r.name,
        sub: [r.admin1, r.country].filter(Boolean).join(', '),
        latitude: r.latitude,
        longitude: r.longitude
    };
}

locationSearch.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter" || !locationSearch.value.trim()) return;

    const name = locationSearch.value.trim();
    locationSearch.value = "";

    const coords = await getCoords(name);
    if (!coords) {
        return;
    }

    savedLocations.push({
        name: coords.name,
        sub: coords.sub,
        emoji: '📍',
        latitude: coords.latitude,
        longitude: coords.longitude
    });
    renderLocations();
});

// --------------------------------------------------------------------------
const homeSearch = document.getElementById("homeSearch");

if (homeSearch) {
    homeSearch.addEventListener("keydown", async (e) => {
        if (e.key !== "Enter" || !homeSearch.value.trim()) return;

        const name = homeSearch.value.trim();
        homeSearch.value = "";

        const coords = await getCoords(name);
        if (!coords) {
            document.getElementById("homeCondition").textContent = "City not found";
            return;
        }

        currentCity = {
            name: coords.name,
            sub: coords.sub,
            lat: coords.latitude,
            lng: coords.longitude
        };
        loadHomeWeather();
    });
}

// ---------------------------api FOR MOVIE APP---------------------------

const API_KEY = "8504bd6e";

const movieInput     = document.getElementById("movieInput");
const movieError     = document.getElementById("movieError");
const movieGrid      = document.getElementById("movieGrid");
const movieDetail    = document.getElementById("movieDetail");
const detailPoster   = document.getElementById("detailPoster");
const detailTitle    = document.getElementById("detailTitle");
const detailYear     = document.getElementById("detailYear");
const detailRuntime  = document.getElementById("detailRuntime");
const detailPlot     = document.getElementById("detailPlot");
const closeDetail    = document.getElementById("closeDetail");

async function searchMovies(query) {
    const url = `https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
}


function renderMovies(results) {
    movieGrid.innerHTML = "";
    document.getElementById("movieEmpty").style.display = "none";

    if (!results || results.length === 0) {
        movieError.textContent = "No results found.";
        return;
    }

    results.forEach(movie => {
        const card = document.createElement("div");
        card.className = "movie-card";
        const posterSrc = (movie.Poster && movie.Poster !== "N/A")
            ? movie.Poster
            : "https://via.placeholder.com/300x450?text=No+Poster";

        card.innerHTML = `
            <img src="${posterSrc}" alt="${movie.Title} poster">
            <div class="movie-card-info">
                <div class="movie-card-title">${movie.Title}</div>
                <div class="movie-card-year">${movie.Year}</div>
            </div>
        `;

        card.addEventListener("click", () => {
            console.log("card clicked:", movie.imdbID)
            showMovieDetail(movie.imdbID);
        });

        movieGrid.appendChild(card);
    });
}

movieInput.addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;

    const query = movieInput.value.trim();
    if (!query) {
        movieError.textContent = "Please enter a movie name.";
        return;
    }
    
    movieError.textContent = "";

    try {
        const data = await searchMovies(query);
        
        if (data.Response === "False") {
            movieError.textContent = data.Error;
            movieGrid.innerHTML = "";
            document.getElementById("movieEmpty").style.display = "block";
            return;
        }
        renderMovies(data.Search);
    } catch (err) {
        movieError.textContent = "Something went wrong. Try again.";
    }
    
});

closeDetail.addEventListener("click", () => {
    movieDetail.style.display = "none";
    movieGrid.scrollIntoView({ behavior: "smooth", block: "start" });
});
movieDetail.addEventListener('click', (e) => {
    if (e.target === movieDetail) closeDetail.click();
});

async function showMovieDetail(imdbID) {
    console.log("showMovieDetail called with:", imdbID);
    movieError.textContent = "";
    try{
        const url = `https://www.omdbapi.com/?apikey=${API_KEY}&i=${imdbID}&plot=short`;
        const res = await fetch(url);
        const data = await res.json();
        console.log("detail response:", data);
        
        if (data.Response === "False") {
            movieError.textContent = data.Error;
            movieDetail.style.display = "block";
            movieDetail.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }

        detailTitle.textContent   = data.Title;
        detailYear.textContent    = data.Year;
        detailRuntime.textContent = data.Runtime;
        detailPlot.textContent    = data.Plot;

        if (data.Poster && data.Poster !== "N/A") {
            detailPoster.src = data.Poster;
            detailPoster.style.display = "block";
        } else {
            detailPoster.src = "";
            detailPoster.style.display = "none";
        }

        movieDetail.style.display = "block";
        console.log("panel shown, display =", movieDetail.style.display);
    } catch (err) {
        console.error("fetch failed:", err);
        movieError.textContent = "Could not load movie details.";
        document.getElementById("movieEmpty").style.display = "block";
    }
}
