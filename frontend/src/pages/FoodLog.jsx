import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { format, parseISO } from "date-fns";
import PropTypes from "prop-types";

const MacroDisplay = ({ label, value, color, unit = "g" }) => (
  <div className="flex flex-col items-center">
    <span className={`text-sm font-medium ${color}`}>
      {value}
      {unit}
    </span>
    <span className="text-xs text-gray-500">{label}</span>
  </div>
);

MacroDisplay.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  color: PropTypes.string.isRequired,
  unit: PropTypes.string,
};

MacroDisplay.defaultProps = {
  unit: "g",
};

export default function FoodLog() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mealsByDay, setMealsByDay] = useState({});

  useEffect(() => {
    fetchMeals();
  }, [user]);

  const fetchMeals = async () => {
    try {
      const { data, error } = await supabase
        .from("meals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group meals by date
      const grouped = data.reduce((acc, meal) => {
        const date = format(parseISO(meal.created_at), "yyyy-MM-dd");
        if (!acc[date]) {
          acc[date] = {
            meals: [],
            totals: {
              calories: 0,
              protein: 0,
              carbs: 0,
              fats: 0,
            },
          };
        }
        acc[date].meals.push(meal);
        acc[date].totals.calories += meal.calories;
        acc[date].totals.protein += meal.protein;
        acc[date].totals.carbs += meal.carbs;
        acc[date].totals.fats += meal.fats;
        return acc;
      }, {});

      setMealsByDay(grouped);
    } catch (error) {
      console.error("Error fetching meals:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getMealTypeIcon = (mealType) => {
    switch (mealType) {
      case "breakfast":
        return "🌅";
      case "lunch":
        return "🌞";
      case "dinner":
        return "🌙";
      case "snack":
        return "🍎";
      default:
        return "🍽️";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 p-4 rounded-md">
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
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Food Log</h1>

      {Object.entries(mealsByDay).map(([date, { meals, totals }]) => (
        <div
          key={date}
          className="mb-8 bg-white rounded-lg shadow overflow-hidden"
        >
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {format(parseISO(date), "EEEE, MMMM d, yyyy")}
              </h2>
              <div className="grid grid-cols-4 gap-4">
                <MacroDisplay
                  label="Calories"
                  value={totals.calories}
                  color="text-indigo-600"
                  unit=""
                />
                <MacroDisplay
                  label="Protein"
                  value={totals.protein}
                  color="text-green-600"
                />
                <MacroDisplay
                  label="Carbs"
                  value={totals.carbs}
                  color="text-yellow-600"
                />
                <MacroDisplay
                  label="Fats"
                  value={totals.fats}
                  color="text-orange-600"
                />
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {meals.map((meal) => (
              <div
                key={meal.id}
                className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150"
              >
                <div className="flex justify-between items-start">
                  <div className="flex">
                    {meal.image_url && (
                      <div className="flex-shrink-0 mr-4">
                        <img
                          src={meal.image_url}
                          alt={`${meal.meal_type} meal`}
                          className="h-24 w-24 rounded-lg object-cover shadow-sm"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src =
                              "https://placehold.co/96x96/f3f4f6/94a3b8?text=No+Image";
                          }}
                        />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center">
                        <span className="text-xl mr-2">
                          {getMealTypeIcon(meal.meal_type)}
                        </span>
                        <h3 className="text-lg font-medium text-gray-900 capitalize">
                          {meal.meal_type}
                        </h3>
                      </div>
                      {meal.notes && (
                        <p className="mt-1 text-sm text-gray-500">
                          {meal.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <MacroDisplay
                      label="Calories"
                      value={meal.calories}
                      color="text-indigo-600"
                      unit=""
                    />
                    <MacroDisplay
                      label="Protein"
                      value={meal.protein}
                      color="text-green-600"
                    />
                    <MacroDisplay
                      label="Carbs"
                      value={meal.carbs}
                      color="text-yellow-600"
                    />
                    <MacroDisplay
                      label="Fats"
                      value={meal.fats}
                      color="text-orange-600"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {Object.keys(mealsByDay).length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            No meals logged yet. Start by adding a meal!
          </p>
        </div>
      )}
    </div>
  );
}
