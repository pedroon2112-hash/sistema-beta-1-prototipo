import { Navigate, Route, Routes } from "react-router-dom";
import Home from "@/pages/Home";
import TableSelect from "@/pages/TableSelect";
import Menu from "@/pages/Menu";
import DeliveryEntry from "@/pages/DeliveryEntry";
import Admin from "@/pages/Admin";

// Uma <Route> por página em src/pages; BrowserRouter já envolve em main.tsx.
// A rota curinga evita páginas em branco para URLs desconhecidas.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/local" element={<TableSelect />} />
      <Route path="/delivery" element={<DeliveryEntry />} />
      <Route path="/cardapio" element={<Menu />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
