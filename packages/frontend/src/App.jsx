import { Auth0Provider } from '@auth0/auth0-react';
import { Map } from './components/Map';
import { SearchPanel } from './components/SearchPanel';
import { LoginButton } from './components/LoginButton';
import './index.css';

function App() {
  return (
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      }}
    >
      <div className="flex h-screen w-screen">
        <SearchPanel />
        <div className="flex-1">
          <Map />
        </div>
      </div>
    </Auth0Provider>
  );
}

export default App;
