/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // GOV.UK Color Palette
        'govuk': {
          'blue': '#1d70b8',           // Primary brand color
          'dark-blue': '#003078',      // Dark variant
          'light-blue': '#5694ca',     // Light variant
          'focus': '#ffdd00',          // Focus indicator (yellow)
          'text': '#0b0c0c',           // Main text color
          'secondary-text': '#505a5f', // Secondary text
          'border': '#b1b4b6',         // Borders
          'input-border': '#0b0c0c',   // Input borders
          'link': '#1d70b8',           // Links
          'link-hover': '#003078',     // Link hover
          'link-visited': '#4c2c92',   // Visited links
          'error': '#d4351c',          // Error red
          'success': '#00703c',        // Success green
          'warning': '#f47738',        // Warning orange
          'background': '#f3f2f1',     // Page background
          'white': '#ffffff',
        },
        // Status badge colors (softer for backgrounds)
        'status': {
          'pending': '#b1b4b6',        // Grey
          'creating': '#ffdd00',       // Yellow
          'building': '#5694ca',       // Light blue
          'deploying': '#4c2c92',      // Purple
          'active': '#00703c',         // Green
          'failed': '#d4351c',         // Red
        }
      },
      fontFamily: {
        // GOV.UK Transport font with fallbacks
        'sans': ['Inter', 'Arial', 'sans-serif'],
      },
      fontSize: {
        // GOV.UK type scale (responsive handled in CSS)
        'body-s': ['16px', '20px'],
        'body': ['19px', '25px'],
        'body-l': ['24px', '30px'],
        'heading-s': ['19px', '25px'],
        'heading-m': ['24px', '30px'],
        'heading-l': ['36px', '40px'],
        'heading-xl': ['48px', '50px'],
      },
      spacing: {
        // GOV.UK spacing scale (mobile values)
        '1': '5px',
        '2': '10px',
        '3': '15px',
        '4': '20px',
        '5': '25px',
        '6': '30px',
        '7': '40px',
        '8': '50px',
        '9': '60px',
      },
      maxWidth: {
        'govuk': '1020px', // GOV.UK max page width
      },
      borderRadius: {
        'none': '0',  // GOV.UK uses minimal border radius
      },
      boxShadow: {
        'none': 'none',
        'sm': '0 2px 4px rgba(0,0,0,0.1)',
      }
    },
  },
  plugins: [],
}
