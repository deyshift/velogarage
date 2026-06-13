export interface Bike {
  id: string;
  name: string;
  distance: number; // meters (Strava gear lifetime distance)
  primary: boolean;
}

export interface Athlete {
  firstname?: string;
  lastname?: string;
  profile_medium?: string;
  bikes?: Bike[];
}

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete_id?: string;
  athlete_name?: string;
  athlete_photo?: string;
}
