import { Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { RecipePage } from "./pages/RecipePage";
import { Layout } from "./components/Layout";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="r/:recipeKey" element={<RecipePage />} />
      </Route>
    </Routes>
  );
}
