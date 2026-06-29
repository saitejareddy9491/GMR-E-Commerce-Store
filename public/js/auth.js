const Auth = (() => {
  return {
    setSession: (token, user) => {
      localStorage.setItem('aether_token', token);
      localStorage.setItem('aether_user', JSON.stringify(user));
    },

    clearSession: () => {
      localStorage.removeItem('aether_token');
      localStorage.removeItem('aether_user');
    },

    isLoggedIn: () => {
      return !!localStorage.getItem('aether_token');
    },

    getToken: () => {
      return localStorage.getItem('aether_token');
    },

    getUser: () => {
      const userStr = localStorage.getItem('aether_user');
      return userStr ? JSON.parse(userStr) : null;
    },

    logout: () => {
      Auth.clearSession();
      window.location.href = '/';
    }
  };
})();
