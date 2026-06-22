import { loginUrl } from "../lib/auth";
import { MOCK, mockSignIn } from "../lib/mock";

// Public assets must be resolved against Vite's configured base
// (/velogarage/app/ on GitHub Pages); an absolute root path would 404.
const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`;

export function Login({ error }: { error?: string }) {
  const button = <img src={asset("connect-with-strava.svg")} alt="Connect with Strava" />;
  return (
    <div className="login">
      <h1>
        <span>Velo</span>Garage
      </h1>
      <div className="tag">Track your bikes. Know when to wrench.</div>
      {error && <div className="err">Login failed: {error}. Please try again.</div>}
      {/* In mock mode the button fakes a sign-in instead of starting OAuth. */}
      {MOCK ? (
        <button type="button" className="btn-strava" onClick={mockSignIn} aria-label="Connect with Strava">
          {button}
        </button>
      ) : (
        <a className="btn-strava" href={loginUrl} aria-label="Connect with Strava">
          {button}
        </a>
      )}
      <div className="fine">
        VeloGarage reads your ride data to calculate component wear. It never posts or modifies your
        Strava activities.
      </div>
      <a
        className="powered-by"
        href="https://www.strava.com"
        target="_blank"
        rel="noreferrer"
        aria-label="Powered by Strava"
      >
        <img src={asset("powered-by-strava.svg")} alt="Powered by Strava" />
      </a>
    </div>
  );
}
