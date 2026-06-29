const Cart = (() => {
  const CART_KEY = 'aether_cart';

  const saveCart = (cart) => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  };

  return {
    getItems: () => {
      const cartStr = localStorage.getItem(CART_KEY);
      return cartStr ? JSON.parse(cartStr) : [];
    },

    addItem: (productId, name, price, image_url, category, quantity = 1, maxStock = 999) => {
      const cart = Cart.getItems();
      const existingItem = cart.find(item => item.productId === productId);

      if (existingItem) {
        const potentialQty = existingItem.quantity + quantity;
        existingItem.quantity = Math.min(potentialQty, maxStock);
      } else {
        cart.push({
          productId,
          name,
          price,
          image_url,
          category,
          quantity,
          maxStock
        });
      }

      saveCart(cart);
      // Update badge immediately
      if (window.App && window.App.updateCartBadge) {
        window.App.updateCartBadge();
      }
    },

    updateQuantity: (productId, quantity) => {
      const cart = Cart.getItems();
      const item = cart.find(item => item.productId === productId);
      if (item) {
        item.quantity = Math.max(1, Math.min(quantity, item.maxStock));
        saveCart(cart);
      }
    },

    removeItem: (productId) => {
      let cart = Cart.getItems();
      cart = cart.filter(item => item.productId !== productId);
      saveCart(cart);
    },

    clear: () => {
      localStorage.removeItem(CART_KEY);
    },

    getCount: () => {
      const cart = Cart.getItems();
      return cart.reduce((total, item) => total + item.quantity, 0);
    }
  };
})();
