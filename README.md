# MacroScope - Nutrition Tracking Application

MacroScope is a modern, user-friendly nutrition tracking application built with React and Supabase. Track your meals, monitor your macronutrients, and achieve your nutrition goals with an intuitive interface.

## Features

- 📊 **Interactive Dashboard**

  - Visual representation of daily nutrition trends
  - Target tracking for calories and macronutrients
  - Progress indicators and goal comparisons

- 🍽️ **Meal Tracking**

  - Quick and easy meal logging
  - Photo upload capability for meals
  - Categorize meals (breakfast, lunch, dinner, snacks)
  - Add notes and detailed macro information

- 📱 **Mobile-Friendly Design**

  - Responsive layout that works on all devices
  - Optimized image handling and display
  - Touch-friendly interface

- 👤 **User Profile**

  - Personalized nutrition targets
  - Activity level tracking
  - Weight and height tracking
  - Progress monitoring

- 📝 **Food Log**
  - Chronological view of meal history
  - Daily macro totals
  - Meal photos and notes
  - Easy-to-read macro breakdowns

## Tech Stack

- Frontend:

  - React
  - Tailwind CSS
  - date-fns
  - React Router
  - PropTypes

- Backend:
  - Supabase (Authentication & Database)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/MacroScope.git
cd MacroScope
```

2. Install dependencies:

```bash
cd frontend
npm install
```

3. Create a `.env` file in the frontend directory with your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_key
```

4. Start the development server:

```bash
npm run dev
```

### Setting up Supabase

1. Create a new Supabase project
2. Set up the following tables:
   - users (managed by Supabase Auth)
   - meals
   - profiles

Required tables schema will be provided in the SQL migrations.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [React](https://reactjs.org/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Backend powered by [Supabase](https://supabase.io/)
