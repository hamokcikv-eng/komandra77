import { NavLink } from 'react-router-dom';
import { useCart } from '../store/CartContext';
import { BagIcon, HomeIcon, Sparkle, UserIcon, MenuIcon } from './Icons';

export function MobileTabBar() {
  const cart = useCart();

  return (
    <nav className="tabbar" aria-label="Mobile navigation">
      <NavLink to="/" className={({ isActive }) => `tabbar__item ${isActive ? 'is-active' : ''}`} end>
        <HomeIcon size={19} />
        Home
      </NavLink>
      <NavLink to="/menu" className={({ isActive }) => `tabbar__item ${isActive ? 'is-active' : ''}`}>
        <MenuIcon size={19} />
        Menu
      </NavLink>
      <button type="button" className="tabbar__item" onClick={cart.openCart} aria-label={`Cart, ${cart.count} items`}>
        <BagIcon size={19} />
        Cart
        {cart.count > 0 ? <span className="tabbar__badge">{cart.count > 9 ? '9+' : cart.count}</span> : null}
      </button>
      <NavLink to="/offers" className={({ isActive }) => `tabbar__item ${isActive ? 'is-active' : ''}`}>
        <Sparkle size={19} />
        Offers
      </NavLink>
      <NavLink to="/account" className={({ isActive }) => `tabbar__item ${isActive ? 'is-active' : ''}`}>
        <UserIcon size={19} />
        Account
      </NavLink>
    </nav>
  );
}
