import { useAuth0 } from '@auth0/auth0-react';
import { useStore } from '../store';
import { useEffect } from 'react';

export function LoginButton() {
  const { loginWithRedirect, isAuthenticated, user, logout, getAccessTokenSilently } = useAuth0();
  const { setToken } = useStore();

  useEffect(() => {
    if (isAuthenticated) {
      getAccessTokenSilently().then((token) => {
        setToken(token);
      });
    }
  }, [isAuthenticated]);

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm">{user?.email}</span>
        <button
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => loginWithRedirect()}
      className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
    >
      Login
    </button>
  );
}
