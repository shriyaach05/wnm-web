const navLinks = document.querySelectorAll('.nav-tabs a, .footer-links a');
const logoLink = document.getElementById('logo-link');
const pages = {
    home: document.getElementById('home'),
    weather: document.getElementById('weather'),
    location: document.getElementById('location'),
    movies: document.getElementById('movies')
};

function showPage(pageName) {
    Object.values(pages).forEach(page => {
        if (page) page.style.display = 'none';
    });

    if (pages[pageName]) {
        pages[pageName].style.display = 'block';
    }

    navLinks.forEach(link => link.classList.remove('active'));

    const activeLink = document.querySelector(`.nav-tabs a[href="#${pageName}"]`);
    if (activeLink) activeLink.classList.add('active');

    if (pageName === 'home' && logoLink) {
        logoLink.classList.add('active');
    } else if (logoLink) {
        logoLink.classList.remove('active');
    }
}

navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();
        showPage(this.getAttribute('href').replace('#', ''));
    });
});

document.querySelectorAll('.hub-card').forEach(card => {
    card.addEventListener('click', () => {
        showPage(card.dataset.target);
    });
});

if (logoLink) {
    logoLink.addEventListener('click', function (e) {
        e.preventDefault();
        showPage('home');
    });
}

renderHubGreeting();
renderLocations();
loadHomeWeather();
showPage('home');