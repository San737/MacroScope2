import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SeedData() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateSampleData = () => {
    const now = new Date();
    const sampleData = [];

    // Generate data for the last 7 days
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      // Breakfast
      sampleData.push({
        user_id: user.id,
        meal_type: "breakfast",
        calories: Math.floor(Math.random() * (600 - 300) + 300),
        protein: Math.floor(Math.random() * (30 - 15) + 15),
        carbs: Math.floor(Math.random() * (60 - 30) + 30),
        fats: Math.floor(Math.random() * (20 - 10) + 10),
        notes: "Sample breakfast data",
        created_at: date.toISOString(),
      });

      // Lunch
      sampleData.push({
        user_id: user.id,
        meal_type: "lunch",
        calories: Math.floor(Math.random() * (800 - 500) + 500),
        protein: Math.floor(Math.random() * (40 - 25) + 25),
        carbs: Math.floor(Math.random() * (80 - 50) + 50),
        fats: Math.floor(Math.random() * (25 - 15) + 15),
        notes: "Sample lunch data",
        created_at: date.toISOString(),
      });

      // Dinner
      sampleData.push({
        user_id: user.id,
        meal_type: "dinner",
        calories: Math.floor(Math.random() * (1000 - 600) + 600),
        protein: Math.floor(Math.random() * (50 - 30) + 30),
        carbs: Math.floor(Math.random() * (90 - 60) + 60),
        fats: Math.floor(Math.random() * (30 - 20) + 20),
        notes: "Sample dinner data",
        created_at: date.toISOString(),
      });

      // Random snack (50% chance)
      if (Math.random() > 0.5) {
        sampleData.push({
          user_id: user.id,
          meal_type: "snack",
          calories: Math.floor(Math.random() * (300 - 100) + 100),
          protein: Math.floor(Math.random() * (15 - 5) + 5),
          carbs: Math.floor(Math.random() * (40 - 20) + 20),
          fats: Math.floor(Math.random() * (15 - 5) + 5),
          notes: "Sample snack data",
          created_at: date.toISOString(),
        });
      }
    }

    return sampleData;
  };

  const handleInsertSampleData = async () => {
    if (!user) {
      setError("You must be logged in to insert sample data");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sampleData = generateSampleData();
      const { error: insertError } = await supabase
        .from("meals")
        .insert(sampleData);

      if (insertError) throw insertError;

      navigate("/dashboard");
    } catch (error) {
      console.error("Error inserting sample data:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Insert Sample Data
        </h2>
        <p className="text-gray-600 mb-2">
          This will insert sample meal data for the last 7 days.
        </p>
        <ul className="list-disc ml-6 mb-6 text-gray-600">
          <li>3 meals per day (breakfast, lunch, dinner)</li>
          <li>Random snacks (50% chance per day)</li>
          <li>Realistic calorie and macro distributions</li>
        </ul>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleInsertSampleData}
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : null}
          {loading ? "Inserting..." : "Insert Sample Data"}
        </button>
      </div>
    </div>
  );
}
