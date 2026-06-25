import { loginUrl } from "../lib/auth";

// Public assets must be resolved against Vite's configured base
// (/velogarage/app/ on GitHub Pages); an absolute root path would 404.
const asset = (name: string) => `${import.meta.env.BASE_URL}${name}`;

function loginErrorMessage(error: string): string {
  if (error === "athletes_limit_exceeded")
    return "This app has reached its limit of connected athletes. Contact the developer to request access.";
  if (error === "access_denied") return "Login was cancelled. Try again when you're ready.";
  return `Login failed: ${error}. Please try again.`;
}

export function Login({ error }: { error?: string }) {
  return (
    <div className="login">
      <h1>
        <span>Velo</span>Garage
      </h1>
      <div className="tag">Track your bikes. Know when to wrench.</div>
      {error && <div className="err">{loginErrorMessage(error)}</div>}
      <a className="btn-strava" href={loginUrl} aria-label="Connect with Strava">
        <img src={asset("connect-with-strava.svg")} alt="Connect with Strava" />
      </a>
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
