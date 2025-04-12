import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import FoodLog from "./pages/FoodLog";
import AddMeal from "./pages/AddMeal";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SeedData from "./pages/SeedData";
import Profile from "./pages/Profile";
import { AuthProvider } from "./contexts/AuthContext";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="food-log" element={<FoodLog />} />
            <Route path="add-meal" element={<AddMeal />} />
            <Route path="seed-data" element={<SeedData />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
