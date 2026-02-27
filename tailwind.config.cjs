module.exports = {
    content: [
        "./index.html",
        "./index.tsx",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./App.tsx",
    ],
    theme: {
        extend: {
            colors: {
                lokBlue: {
                    950: '#020617',
                    900: '#0f172a',
                    800: '#1e293b',
                },
                lokGold: {
                    400: '#fbbf24',
                    500: '#f59e0b',
                    600: '#d97706',
                },
                lokGreen: {
                    500: '#10b981',
                    600: '#059669',
                },
                gameBlue: '#00BEFF',
                gameDarkBlue: '#023047',
                gameOrange: '#FF6B00',
                gameGreen: '#4CAF50',
                gameRed: '#E63946',
                gameYellow: '#FFD700',
                gamePurple: '#9D4EDD',
            },
            fontFamily: {
                sans: ['Lato', 'sans-serif'],
                serif: ['Cinzel', 'serif'],
            },
            backgroundImage: {
                'war-room': "url('https://www.transparenttextures.com/patterns/stardust.png')",
            },
            animation: {
                'scroll-left': 'scroll-left 40s linear infinite',
            },
            keyframes: {
                'scroll-left': {
                    '0%': { transform: 'translateX(0)' },
                    '100%': { transform: 'translateX(-50%)' },
                },
            },
        },
    },
    plugins: [],
}
