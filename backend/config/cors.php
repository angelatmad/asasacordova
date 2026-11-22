<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | This configuration allows the deployed frontend and local development
    | frontend to communicate with the Laravel backend.
    |
    */

    // API routes that allow cross-origin requests.
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    // Allow all HTTP methods.
    'allowed_methods' => ['*'],

    // Allowed frontend addresses.
    'allowed_origins' => [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://asasacordova.vercel.app',
    ],

    'allowed_origins_patterns' => [],

    // Allow all request headers.
    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    // Cache preflight responses.
    'max_age' => 0,

    // Allow cookies and credentials.
    'supports_credentials' => true,
];
