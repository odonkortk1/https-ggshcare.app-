import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Minus, Plus, ShoppingBag, Loader2, Banknote, Smartphone, ShoppingBasket, UtensilsCrossed } from "lucide-react";
import { useClientAuth } from "@/lib/ClientAuthContext";

export default function CartDrawer({ open, onOpenChange, items = [], onRemove, onQtyChange, onPlaceOrder, submitting }) {
  const { client } = useClientAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [diningOption, setDiningOption] = useState(null); // "takeaway" | "dine_in"

  // Safely guard array operations against undefined/null props
  const safeItems = Array.isArray(items) ? items : [];
  const total = safeItems.reduce((s, i) => s + (i?.price || 0) * (i?.quantity || 1), 0);

  useEffect(() => {
    if (client?.full_name) setName(client.full_name);
    if (client?.phone_number) setPhone(client.phone_number);
  }, [client]);

  const diningLabel = diningOption === "takeaway" ? "Takeaway" : diningOption === "dine_in" ? "Dine In" : "";

  const handleOrder = () => {
    onPlaceOrder({
      customer_name: name,
      pickup_note: diningLabel,
      cashPayment: payMethod === "cash",
      ggshPayment: payMethod === "momo",
      client_phone: client?.phone_number || phone,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2 font-heading">
            <ShoppingBag className="w-5 h-5 text-blue-600" /> Your Order
          </SheetTitle>
        </SheetHeader>

        {safeItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Your cart is empty</p>
            <p className="text-xs text-muted-foreground">Add items from the menu to get started.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {safeItems.map((item) => (
                <div key={item.name} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{"\u20B5"}{(item.price || 0).toFixed(2)} each</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onQtyChange(item.name, item.quantity - 1)}
                      className="w-6 h-6 rounded-md border flex items-center justify-center hover:bg-muted"
                    >
                      {item.quantity === 1 ? <Trash2 className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3" />}
                    </button>
                    <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => onQtyChange(item.name, item.quantity + 1)}
                      className="w-6 h-6 rounded-md border flex items-center justify-center hover:bg-muted"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-sm font-semibold w-16 text-right">{"\u20B5"}{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="px-5 py-3 border-t space-y-3">
              <div className="grid gap-2">
                <Label className="text-xs">Takeaway or dine in? <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDiningOption("takeaway")}
                    className={`flex flex-col items-center gap-1 px-1 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      diningOption === "takeaway"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-border text-muted-foreground hover:border-blue-300"
                    }`}
                  >
                    <ShoppingBasket className="w-4 h-4" /> Takeaway
                  </button>
                  <button
                    onClick={() => setDiningOption("dine_in")}
                    className={`flex flex-col items-center gap-1 px-1 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      diningOption === "dine_in"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-border text-muted-foreground hover:border-blue-300"
                    }`}
                  >
                    <UtensilsCrossed className="w-4 h-4" /> Dine In
                  </button>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cust-name" className="text-xs">Name for pickup</Label>
                <Input
                  id="cust-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Mensah"
                  className="h-9"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cust-phone" className="text-xs">Phone number <span className="text-destructive">*</span></Label>
                <Input
                  id="cust-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="e.g. 0244123456"
                  className="h-9"
                  inputMode="tel"
                  maxLength={10}
                  required
                />
                {phone.length > 0 && !/^0\d{9}$/.test(phone) && (
                  <p className="text-[11px] text-amber-600">Must be 10 digits starting with 0</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label className="text-xs">Payment method</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPayMethod("cash")}
                    className={`flex flex-col items-center gap-1 px-1 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      payMethod === "cash"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-border text-muted-foreground hover:border-blue-300"
                    }`}
                  >
                    <Banknote className="w-4 h-4" /> Cash
                  </button>
                  <button
                    onClick={() => setPayMethod("momo")}
                    className={`flex flex-col items-center gap-1 px-1 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                      payMethod === "momo"
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-border text-muted-foreground hover:border-blue-300"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" /> MoMo
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-heading font-bold text-blue-700">{"\u20B5"}{total.toFixed(2)}</span>
              </div>
            </div>

            <SheetFooter className="px-5 pb-5 pt-1">
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!name.trim() || !/^0\d{9}$/.test(phone) || !diningOption || submitting}
                onClick={handleOrder}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Placing order...</>
                ) : payMethod === "momo" ? (
                  <><Smartphone className="w-4 h-4 mr-2" /> Place order . Pay via MoMo</>
                ) : (
                  <><Banknote className="w-4 h-4 mr-2" /> Place order . Pay at pickup</>
                )}
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}