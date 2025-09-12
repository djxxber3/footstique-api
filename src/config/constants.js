// Supported football leagues configuration
export const SUPPORTED_LEAGUES = [
// World Cup
// World Cup
1,
// Champions League
2,
// Europa League
3,
// Euro Championship
4,
// FA Cup
5,
// Africa Cup of Nations
6,
// Copa America
9,
// Asian Cup
19,
    15,
// Leagues (misc)
17, 18, 20, 24, 29, 30, 31, 32, 33, 34, 35, 36, 39, 40, 41, 45, 48,
// Bundesliga
54,
// Ligue 1
61,
// Premier League 2
94,
// Serie A
135,
// La Liga
140,
// Other leagues
143, 144, 147,
// Qatari Stars League
186,
// Other
197, 200, 201, 202,
// Egyptian Premier League
233,
// Other
262, 263, 264,
// Coupe de France
307,
// Coppa Italia
308,
// Copa del Rey
531,
// Other
533, 538, 539,
// Other
390, 496, 514, 516, 556,
// Other
714, 720,
// UAE Pro League
826,
// Other
768, 801, 807, 822, 848, 860, 895, 934, 953,
// Other
1129, 1132, 1163

];

// API Football configuration
export const API_CONFIG = {
    BASE_URL: process.env.API_FOOTBALL_URL || 'https://v3.football.api-sports.io',
    KEY: process.env.API_FOOTBALL_KEY,
    TIMEOUT: 30000,
    RATE_LIMIT_DELAY: 1000, // 1 second between requests
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000
};

// Date configuration
export const DATE_CONFIG = {
    SYNC_DAYS_BEFORE: 3,  // Sync last 3 days
    SYNC_DAYS_AFTER: 3,   // Sync next 3 days
    TIMEZONE: process.env.TIMEZONE || 'Africa/Algiers'
};

// Server configuration
export const SERVER_CONFIG = {
    MAX_RESULTS_PER_PAGE: 100,
    DEFAULT_PAGE_SIZE: 20,
    CACHE_TTL: 300, // 5 minutes
    REQUEST_TIMEOUT: 30000
};

// Validation rules
export const VALIDATION_RULES = {
    CHANNEL_NAME_MIN_LENGTH: 2,
    CHANNEL_NAME_MAX_LENGTH: 100,
    CHANNEL_URL_MAX_LENGTH: 500,
    PASSKEY_MIN_LENGTH: 8,
    DATE_FORMAT: 'YYYY-MM-DD'
};
