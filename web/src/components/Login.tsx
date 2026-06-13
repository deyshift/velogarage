import { loginUrl } from "../lib/auth";

export function Login({ error }: { error?: string }) {
  return (
    <div className="login">
      <div className="emoji">🚲</div>
      <h1>
        <span>Velo</span>Garage
      </h1>
      <div className="tag">Track your bikes. Know when to wrench.</div>
      {error && <div className="err">Login failed: {error}. Please try again.</div>}
      <a className="btn-strava" href={loginUrl}>
        Connect with Strava
      </a>
      <div className="fine">
        VeloGarage reads your ride data to calculate component wear. It never posts or modifies your
        Strava activities.
      </div>
    </div>
  );
}
