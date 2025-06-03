## Projekt: Spotify Tool / Spotify Mood Sorter

## Autor: Dominik Długołencki

## Opis Projektu:
Spotify Tool to Single Page Application (SPA) umożliwiająca interakcję z serwisami Spotify i Last.fm. Aplikacja działa w dwóch trybach:
1.  **Demonstracyjny:** Prezentuje funkcjonalności na predefiniowanych danych (mock playlisty, utwory, symulowane cechy audio i filtrowanie nastrojów).
2.  **Połączony z Spotify:** Po autoryzacji OAuth 2.0 (PKCE), pozwala na przeglądanie osobistych playlist Spotify, utworów, wyszukiwanie podobnych utworów przez Last.fm oraz dostęp do statystyk użytkownika (top artyści/utwory, ostatnio odtwarzane).

**Kluczowe Funkcjonalności Ogólne:**
-   Strona lądowania z wyborem trybu.
-   Dynamiczne przełączanie widoków bez przeładowania strony.
-   **Zaawansowane Ustawienia:** Personalizacja wyglądu (motyw jasny/ciemny, kolor akcentu, rozmiar czcionki), limit wyników z Last.fm, zapis w `localStorage`.
-   **Rozbudowany Formularz Kontaktowy:** Z walidacją i symulacją wysyłki (dane zapisywane do `localStorage`).
-   Responsywny design (RWD).

## Technologie:
-   **Frontend:** HTML5, CSS3 (zmienne CSS, Flexbox), JavaScript (ES6+, async/await, Fetch API, localStorage)
-   **API Zewnętrzne:** Spotify Web API, Last.fm API
-   **Biblioteki JS:** `spotify-web-api-js`
-   **Hosting:** GitHub Pages

## Uruchomienie:

**1. Online (Zalecane):**
   -   Dostępna pod adresem: [https://jedenastek.github.io/](https://jedenastek.github.io/)

**2. Lokalne:**
   1.  Sklonuj repozytorium: `git clone https://github.com/Jedenastek/Jedenastek.github.io.git`
   2.  Przejdź do folderu projektu: `cd Jedenastek.github.io`
   3.  Otwórz `index.html` za pomocą lokalnego serwera deweloperskiego (np. "Live Server" w VS Code) aby uniknąć problemów z CORS.

## Uwagi:
-   Klucze API (Spotify Client ID, Last.fm API Key) są osadzone w `app.js` dla uproszczenia projektu zaliczeniowego.
-   Aplikacja wykorzystuje `localStorage` do przechowywania ustawień, tokenów i symulowanych danych.
-   Tryb demo używa statycznych plików JSON z folderu `data/`.