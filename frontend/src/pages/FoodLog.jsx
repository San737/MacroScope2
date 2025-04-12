import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { format, parseISO } from "date-fns";
import PropTypes from "prop-types";
import { TrashIcon } from "@heroicons/react/24/outline";

const MacroDisplay = ({ label, value, color, unit = "g" }) => (
  <div className="flex flex-col items-center text-center">
    <span className={`text-sm sm:text-base font-medium ${color}`}>
      {value}
      {unit}
    </span>
    <span className="text-xs sm:text-sm text-gray-500">{label}</span>
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
  const [deletingMealId, setDeletingMealId] = useState(null);

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

  const deleteMeal = async (mealId) => {
    try {
      setDeletingMealId(mealId);
      const { error } = await supabase
        .from("meals")
        .delete()
        .eq("id", mealId)
        .eq("user_id", user.id);

      if (error) throw error;

      // Update the UI by removing the deleted meal
      setMealsByDay((prevMealsByDay) => {
        const newMealsByDay = { ...prevMealsByDay };

        // Find and remove the meal from the appropriate day
        Object.keys(newMealsByDay).forEach((date) => {
          const dayData = newMealsByDay[date];
          const mealIndex = dayData.meals.findIndex((m) => m.id === mealId);

          if (mealIndex !== -1) {
            // Remove the meal
            const deletedMeal = dayData.meals[mealIndex];
            dayData.meals = dayData.meals.filter((m) => m.id !== mealId);

            // Update the totals
            dayData.totals.calories -= deletedMeal.calories;
            dayData.totals.protein -= deletedMeal.protein;
            dayData.totals.carbs -= deletedMeal.carbs;
            dayData.totals.fats -= deletedMeal.fats;

            // If no meals left for this day, remove the day
            if (dayData.meals.length === 0) {
              delete newMealsByDay[date];
            }
          }
        });

        return newMealsByDay;
      });
    } catch (error) {
      console.error("Error deleting meal:", error);
      setError(error.message);
    } finally {
      setDeletingMealId(null);
    }
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;

    if (imageUrl.startsWith("data:")) {
      return imageUrl;
    }

    if (imageUrl.startsWith("meal-images/")) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("meal-images").getPublicUrl(imageUrl);
      return publicUrl;
    }

    if (imageUrl.startsWith("http")) {
      return imageUrl;
    }

    return null;
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
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-8">
        Food Log
      </h1>

      {Object.entries(mealsByDay).map(([date, { meals, totals }]) => (
        <div
          key={date}
          className="mb-4 sm:mb-8 bg-white rounded-lg shadow overflow-hidden"
        >
          <div className="px-3 sm:px-6 py-3 sm:py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                {format(parseISO(date), "EEEE, MMMM d, yyyy")}
              </h2>
              <div className="grid grid-cols-4 gap-2 sm:gap-4">
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
                className="px-3 sm:px-6 py-3 sm:py-4 hover:bg-gray-50 transition-colors duration-150"
              >
                <div className="flex flex-col space-y-3">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex mb-3 sm:mb-0">
                        {meal.image_url && (
                          <div className="flex-shrink-0 mr-3">
                            <img
                              src={
                                getImageUrl(meal.image_url) ||
                                "https://placehold.co/96x96/f3f4f6/94a3b8?text=No+Image"
                              }
                              alt={`${meal.name}`}
                              className="h-16 w-16 sm:h-24 sm:w-24 rounded-lg object-cover shadow-sm bg-gray-100"
                              loading="lazy"
                              onError={(e) => {
                                console.error("Image load error:", e);
                                e.target.onerror = null;
                                e.target.src =
                                  "https://placehold.co/96x96/f3f4f6/94a3b8?text=No+Image";
                              }}
                            />
                          </div>
                        )}
                        <div className="flex items-center">
                          <span className="text-xl mr-2">
                            {getMealTypeIcon(meal.meal_type)}
                          </span>
                          <div>
                            <h3 className="text-base sm:text-lg font-medium text-gray-900">
                              {meal.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {format(parseISO(meal.created_at), "h:mm a")}
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMeal(meal.id)}
                        disabled={deletingMealId === meal.id}
                        className="text-gray-400 hover:text-red-500 transition-colors duration-150 p-2 rounded-full hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                        title="Delete meal"
                      >
                        {deletingMealId === meal.id ? (
                          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-red-500" />
                        ) : (
                          <TrashIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:gap-4 w-full sm:w-auto">
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
                  {meal.notes && (
                    <div className="mt-1 sm:pl-20">
                      <p className="text-xs sm:text-sm text-gray-500 break-words">
                        {meal.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {Object.keys(mealsByDay).length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <p className="text-sm sm:text-base text-gray-500">
            No meals logged yet. Start by adding a meal!
          </p>
        </div>
      )}
    </div>
  );
}
