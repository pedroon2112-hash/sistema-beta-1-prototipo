import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useOrder } from "@/context/OrderContext";

// Rota /delivery — ativa o modo delivery e segue direto para o cardápio.
export default function DeliveryEntry() {
  const { setDeliveryMode } = useOrder();

  useEffect(() => {
    setDeliveryMode();
  }, [setDeliveryMode]);

  return <Navigate to="/cardapio" replace />;
}
