import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bike, Home, MapPin, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { restaurantInfo } from "@/data/menu";
import { useOrder } from "@/context/OrderContext";

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
}

export default function Header({ cartCount, onOpenCart }: HeaderProps) {
  const { mode, tableNumber, setDeliveryMode } = useOrder();
  const navigate = useNavigate();
  const [modePopoverOpen, setModePopoverOpen] = useState(false);

  return (
    <header
      data-testid="app-header"
      className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md shadow-md"
    >
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        <Link
          to="/"
          data-testid="header-home-link"
          className="flex min-w-0 items-center gap-2.5"
          aria-label="Voltar ao início"
        >
          <img
            src={restaurantInfo.logo}
            alt={`Logo ${restaurantInfo.name}`}
            className="h-10 w-10 shrink-0 rounded-md"
          />
          <span className="truncate font-heading text-lg font-bold tracking-tight text-zinc-50">
            GalegonN
            <span className="ml-1.5 hidden text-xs font-medium uppercase tracking-widest text-zinc-400 sm:inline">
              Restaurante e Pizzaria
            </span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {mode && (
            <Popover open={modePopoverOpen} onOpenChange={setModePopoverOpen}>
              <PopoverTrigger
                render={
                  <Button
                    data-testid="header-mode-badge"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 border-orange-600/50 bg-orange-950/30 text-orange-400 hover:bg-orange-950/60 hover:text-orange-300"
                  />
                }
              >
                {mode === "local" ? (
                  <MapPin className="size-4" aria-hidden />
                ) : (
                  <Bike className="size-4" aria-hidden />
                )}
                <span className="max-w-28 truncate">
                  {mode === "local"
                    ? `Mesa ${String(tableNumber ?? "").padStart(2, "0")}`
                    : "Delivery"}
                </span>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-2">
                <div className="flex flex-col gap-1">
                  {mode === "local" && (
                    <Button
                      data-testid="change-table-btn"
                      variant="ghost"
                      size="sm"
                      className="justify-start gap-2"
                      onClick={() => {
                        setModePopoverOpen(false);
                        navigate("/local");
                      }}
                    >
                      <MapPin className="size-4" aria-hidden />
                      Trocar mesa
                    </Button>
                  )}
                  {mode === "local" ? (
                    <Button
                      data-testid="switch-delivery-btn"
                      variant="ghost"
                      size="sm"
                      className="justify-start gap-2"
                      onClick={() => {
                        setModePopoverOpen(false);
                        setDeliveryMode();
                      }}
                    >
                      <Bike className="size-4" aria-hidden />
                      Mudar para Delivery
                    </Button>
                  ) : (
                    <Button
                      data-testid="switch-local-btn"
                      variant="ghost"
                      size="sm"
                      className="justify-start gap-2"
                      onClick={() => {
                        setModePopoverOpen(false);
                        navigate("/local");
                      }}
                    >
                      <UtensilsCrossed className="size-4" aria-hidden />
                      Mudar para No Local
                    </Button>
                  )}
                  <Button
                    data-testid="go-home-btn"
                    variant="ghost"
                    size="sm"
                    className="justify-start gap-2"
                    onClick={() => {
                      setModePopoverOpen(false);
                      navigate("/");
                    }}
                  >
                    <Home className="size-4" aria-hidden />
                    Início
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          <Button
            data-testid="header-cart-button"
            variant="outline"
            size="sm"
            className="relative gap-1.5"
            onClick={onOpenCart}
            aria-label={`Abrir carrinho, ${cartCount} itens`}
          >
            <ShoppingCart className="size-4" aria-hidden />
            <span className="hidden sm:inline">Carrinho</span>
            {cartCount > 0 && (
              <span
                data-testid="header-cart-badge"
                className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1 text-xs font-bold text-white animate-cart-pop"
                key={cartCount}
              >
                {cartCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
