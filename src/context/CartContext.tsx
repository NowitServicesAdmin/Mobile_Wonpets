import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Address, Offer, Order, PaymentMethod, Product } from '../data/mock';
import { toast } from '../components/WonPetsAlert';
import { useAuth } from './AuthContext';
import { errorMessage } from '../services/api';
import { AddressInput, addressService, cartService, CartLine, ordersService, wishlistService } from '../services/store.service';
import { payWithRazorpay } from '../utils/razorpay';

type PlaceOrderArgs = { addressId: string; payment: PaymentMethod; expectedTotal: number };

/** True once the first server answer (or failure) for that part has arrived - screens show a skeleton until then. */
type Loaded = { cart: boolean; wishlist: boolean; addresses: boolean; orders: boolean };

type Ctx = {
  /** First-load state of each store area, for loading skeletons. */
  loaded: Loaded;
  /* cart */
  cartItems: CartLine[];
  cartCount: number;
  /** Sum of price x qty, before coupon and delivery. */
  cartTotal: number;
  /** Resolves true when the product was added. */
  addToCart: (productId: string, qty?: number) => Promise<boolean>;
  setQty: (productId: string, qty: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  refreshWishlist: () => Promise<void>;

  /* coupons (live on the cart on the server) */
  couponCode: string;
  discount: number;
  offers: Offer[];
  /** Resolves with an error message, or '' when the coupon was applied. */
  applyCoupon: (code: string) => Promise<string>;
  removeCoupon: () => Promise<void>;

  /* wishlist */
  wishlist: string[];
  wishlistProducts: Product[];
  toggleWishlist: (productId: string) => Promise<void>;

  /* addresses */
  addresses: Address[];
  selectedAddressId: string;
  setSelectedAddressId: (id: string) => void;
  /** Resolves with the saved address, or null when it failed (the error is already shown). */
  saveAddress: (a: AddressInput) => Promise<Address | null>;
  refreshAddresses: () => Promise<void>;

  /* orders */
  orders: Order[];
  refreshOrders: () => Promise<void>;
  /** Inserts or replaces one order (e.g. the full order loaded by the detail screen). */
  upsertOrder: (o: Order) => void;
  /** Resolves true when the order was cancelled. */
  cancelOrder: (id: string) => Promise<boolean>;
  /** COD places it straight away; Online Payment opens Razorpay first. Throws on failure / cancel. */
  placeOrder: (a: PlaceOrderArgs) => Promise<Order>;
};

const CartContext = createContext<Ctx>({} as Ctx);
export const useCart = () => useContext(CartContext);

const money = (n: number) => Math.round(n * 100) / 100;

/**
 * Store state for the signed-in user: cart + coupons, wishlist, saved addresses and orders.
 * Everything is kept on the server; this context mirrors it and updates the screens.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [cartItems, setCartItems] = useState<CartLine[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loaded, setLoaded] = useState<Loaded>({ cart: false, wishlist: false, addresses: false, orders: false });
  const markLoaded = useCallback((k: keyof Loaded) => setLoaded((l) => (l[k] ? l : { ...l, [k]: true })), []);

  // used inside async code so a stale closure never overwrites newer state
  const selectedRef = useRef('');
  selectedRef.current = selectedAddressId;

  /* ---------- coupons ---------- */
  const refreshCoupons = useCallback(async () => {
    try {
      const c = await cartService.coupons();
      setCouponCode(c.appliedCode);
      setDiscount(c.couponDiscount);
      setOffers(c.offers);
      if (c.removedReason) toast.info(c.removedReason);
    } catch { /* coupons are optional - the cart still works without them */ }
  }, []);

  /* ---------- cart ---------- */
  const refreshCart = useCallback(async () => {
    try {
      const { lines } = await cartService.get();
      setCartItems(lines);
    } catch { /* keep what we have */ }
    await refreshCoupons();
    markLoaded('cart');
  }, [refreshCoupons, markLoaded]);

  const addToCart: Ctx['addToCart'] = async (productId, qty = 1) => {
    try {
      await cartService.add(productId, qty);
      await refreshCart();
      return true;
    } catch (e) {
      toast.error(errorMessage(e, 'Could not add to cart.'));
      return false;
    }
  };

  const setQty: Ctx['setQty'] = async (productId, qty) => {
    if (qty < 1) return removeFromCart(productId);
    const before = cartItems;
    setCartItems((items) => items.map((l) => (l.product.id === productId ? { ...l, qty } : l))); // instant
    try {
      await cartService.setQty(productId, qty);
      await refreshCoupons();
    } catch (e) {
      setCartItems(before);
      toast.error(errorMessage(e, 'Could not update the quantity.'));
    }
  };

  const removeFromCart: Ctx['removeFromCart'] = async (productId) => {
    const before = cartItems;
    setCartItems((items) => items.filter((l) => l.product.id !== productId));
    try {
      await cartService.remove(productId);
      await refreshCoupons();
    } catch (e) {
      setCartItems(before);
      toast.error(errorMessage(e, 'Could not remove the item.'));
    }
  };

  const clearCart: Ctx['clearCart'] = async () => {
    const before = cartItems;
    setCartItems([]);
    setCouponCode('');
    setDiscount(0);
    try {
      await cartService.clear();
      await refreshCoupons();
    } catch (e) {
      setCartItems(before);
      toast.error(errorMessage(e, 'Could not clear the cart.'));
      refreshCart();
    }
  };

  const applyCoupon: Ctx['applyCoupon'] = async (code) => {
    try {
      const c = await cartService.applyCoupon(code);
      setCouponCode(c.appliedCode);
      setDiscount(c.couponDiscount);
      setOffers(c.offers);
      return '';
    } catch (e) {
      return errorMessage(e, 'This coupon could not be applied.');
    }
  };

  const removeCoupon: Ctx['removeCoupon'] = async () => {
    try {
      const c = await cartService.removeCoupon();
      setCouponCode(c.appliedCode);
      setDiscount(c.couponDiscount);
      setOffers(c.offers);
    } catch (e) {
      toast.error(errorMessage(e, 'Could not remove the coupon.'));
    }
  };

  /* ---------- wishlist ---------- */
  const wishlist = useMemo(() => wishlistProducts.map((p) => p.id), [wishlistProducts]);

  const refreshWishlist = useCallback(async () => {
    try {
      setWishlistProducts(await wishlistService.get());
    } catch { /* keep what we have */ }
    markLoaded('wishlist');
  }, [markLoaded]);

  const toggleWishlist: Ctx['toggleWishlist'] = async (productId) => {
    const before = wishlistProducts;
    const on = before.some((p) => p.id === productId);
    // removing is instant; adding needs the product, so it is filled in by the refresh below
    if (on) setWishlistProducts(before.filter((p) => p.id !== productId));
    try {
      if (on) await wishlistService.remove(productId);
      else await wishlistService.add(productId);
      if (!on) await refreshWishlist();
    } catch (e) {
      setWishlistProducts(before);
      toast.error(errorMessage(e, 'Could not update your wishlist.'));
    }
  };

  /* ---------- addresses ---------- */
  const refreshAddresses = useCallback(async () => {
    try {
      const list = await addressService.list();
      setAddresses(list);
      const current = selectedRef.current;
      if (!current || !list.some((a) => a.id === current)) {
        setSelectedAddressId((list.find((a) => a.isDefault) ?? list[0])?.id ?? '');
      }
    } catch { /* keep what we have */ }
    markLoaded('addresses');
  }, [markLoaded]);

  const saveAddress: Ctx['saveAddress'] = async (a) => {
    try {
      const saved = await addressService.save(a);
      await refreshAddresses();
      setSelectedAddressId(saved.id);
      return saved;
    } catch (e) {
      toast.error(errorMessage(e, 'Could not save the address.'));
      return null;
    }
  };

  /* ---------- orders ---------- */
  const refreshOrders = useCallback(async () => {
    try {
      setOrders(await ordersService.list());
    } catch { /* keep what we have */ }
    markLoaded('orders');
  }, [markLoaded]);

  const upsertOrder: Ctx['upsertOrder'] = useCallback((o) => {
    setOrders((list) => (list.some((x) => x.id === o.id) ? list.map((x) => (x.id === o.id ? { ...x, ...o } : x)) : [o, ...list]));
  }, []);

  const cancelOrder: Ctx['cancelOrder'] = async (id) => {
    try {
      await ordersService.cancel(id);
      setOrders((list) => list.map((o) => (o.id === id ? { ...o, status: 'Cancelled' } : o)));
      refreshOrders();
      return true;
    } catch (e) {
      toast.error(errorMessage(e, 'Could not cancel the order.'));
      return false;
    }
  };

  const placeOrder: Ctx['placeOrder'] = async ({ addressId, payment, expectedTotal }) => {
    let order: Order;
    if (payment === 'Cash on Delivery') {
      order = await ordersService.placeCod(addressId, expectedTotal);
    } else {
      // 1) server creates the Razorpay order, 2) customer pays, 3) server verifies the payment and places the order
      const init = await ordersService.initiateOnline(addressId, expectedTotal);
      const paid = await payWithRazorpay({
        keyId: init.keyId,
        orderId: init.order.id,
        amountPaise: init.order.amount,
        title: 'WON PET PRO',
        description: `Order of ${money(expectedTotal)} INR`,
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
      });
      order = await ordersService.verifyOnline(paid);
    }
    upsertOrder(order);
    // the server empties the cart once the order is placed
    setCartItems([]);
    setCouponCode('');
    setDiscount(0);
    refreshOrders();
    refreshCart();
    return order;
  };

  /* ---------- load on sign-in, wipe on sign-out ---------- */
  useEffect(() => {
    if (!userId) {
      setCartItems([]); setCouponCode(''); setDiscount(0); setOffers([]);
      setWishlistProducts([]); setAddresses([]); setSelectedAddressId(''); setOrders([]);
      setLoaded({ cart: false, wishlist: false, addresses: false, orders: false });
      return;
    }
    refreshCart();
    refreshWishlist();
    refreshAddresses();
    refreshOrders();
  }, [userId]);

  const cartCount = useMemo(() => cartItems.reduce((n, l) => n + l.qty, 0), [cartItems]);
  const cartTotal = useMemo(() => money(cartItems.reduce((s, l) => s + l.product.price * l.qty, 0)), [cartItems]);

  const value: Ctx = {
    loaded,
    cartItems, cartCount, cartTotal, addToCart, setQty, removeFromCart, clearCart, refreshCart, refreshWishlist,
    couponCode, discount, offers, applyCoupon, removeCoupon,
    wishlist, wishlistProducts, toggleWishlist,
    addresses, selectedAddressId, setSelectedAddressId, saveAddress, refreshAddresses,
    orders, refreshOrders, upsertOrder, cancelOrder, placeOrder,
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}