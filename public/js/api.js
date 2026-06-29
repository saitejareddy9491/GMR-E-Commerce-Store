const Api = (() => {
  const getHeaders = () => {
    const token = localStorage.getItem('aether_token');
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const handleResponse = async (response) => {
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Network error occurred.');
    }
    return data;
  };

  return {
    // Auth endpoints
    login: async (username, password) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ username, password })
      });
      return handleResponse(res);
    },

    register: async (username, email, password) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ username, email, password })
      });
      return handleResponse(res);
    },

    getProfile: async () => {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: getHeaders()
      });
      return handleResponse(res);
    },

    // Product endpoints
    getProducts: async () => {
      const res = await fetch('/api/products', {
        method: 'GET',
        headers: getHeaders()
      });
      return handleResponse(res);
    },

    getProductDetails: async (id) => {
      const res = await fetch(`/api/products/${id}`, {
        method: 'GET',
        headers: getHeaders()
      });
      return handleResponse(res);
    },

    // Order endpoints
    placeOrder: async (address, items) => {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ address, items })
      });
      return handleResponse(res);
    },

    // Admin endpoints
    getAdminOrders: async () => {
      const res = await fetch('/api/admin/orders', {
        method: 'GET',
        headers: getHeaders()
      });
      return handleResponse(res);
    },

    updateOrderStatus: async (orderId, status) => {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ status })
      });
      return handleResponse(res);
    }
  };
})();
