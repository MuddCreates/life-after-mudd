export interface ApiResponse {
  city: string;
  cityLat: string;
  cityLong: string;
  comments: string;
  country: string;
  facebookProfile: string;
  email: string;
  major: string;
  name: string;
  org: string;
  orgLat: string;
  orgLink: string;
  orgLong: string;
  path: string;
  phoneNumber: string;
  state: string;
  summerCity: string;
  summerCityLat: string;
  summerCityLong: string;
  summerCountry: string;
  summerOrg: string;
  summerOrgLat: string;
  summerOrgLink: string;
  summerOrgLong: string;
  summerPlans: string;
  summerState: string;
  postGradEmail: string;
}

export interface Response extends ApiResponse {
  idx: number;
  orgLatLong: LatLong | null;
  summerOrgLatLong: LatLong | null;
  cityLatLong: LatLong | null;
  summerCityLatLong: LatLong | null;
  showSummer?: boolean;
  showLongTerm?: boolean;
}

export type ResponsePublicKey =
  | "city"
  | "cityLat"
  | "cityLong"
  | "comments"
  | "country"
  | "facebookProfile"
  | "email"
  | "major"
  | "name"
  | "org"
  | "orgLat"
  | "orgLink"
  | "orgLong"
  | "path"
  | "phoneNumber"
  | "state"
  | "summerCity"
  | "summerCityLat"
  | "summerCityLong"
  | "summerCountry"
  | "summerOrg"
  | "summerOrgLat"
  | "summerOrgLink"
  | "summerOrgLong"
  | "summerPlans"
  | "summerState"
  | "email"
  | "postGradEmail";

export type ResponseKey = ResponsePublicKey;

export interface LatLong {
  lng: number;
  lat: number;
}

export interface ResponsePublic extends Record<ResponsePublicKey, string> {
  orgLatLong: LatLong;
  summerOrgLatLong: LatLong;
  cityLatLong: LatLong;
  summerCityLatLong: LatLong;
  showSummer?: boolean;
  showLongTerm?: boolean;
}
