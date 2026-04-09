import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { MealPage } from "./pages/MealPage";
import { RecipePage } from "./pages/RecipePage";
import { SearchPage } from "./pages/SearchPage";
import { Layout } from "./components/Layout";

/** Legacy category URLs → meal-type routes (same slug). */
function LegacyCategoryRedirect() {
  const { categorySlug = "" } = useParams();
  return <Navigate to={`/m/${categorySlug}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="m/:mealSlug" element={<MealPage />} />
        <Route path="c/:categorySlug" element={<LegacyCategoryRedirect />} />
        <Route path="r/:recipeKey" element={<RecipePage />} />
      </Route>
    </Routes>
  );
}
