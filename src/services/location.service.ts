import { api } from './api';

export type PlaceDetails = {
  placeId?: string; address: string; latitude: number; longitude: number;
  area: string; city: string; district: string; state: string; country: string; pincode: string;
};
export type Prediction = { place_id: string; description: string };

export const locationService = {
  async search(q: string): Promise<Prediction[]> {
    const { data } = await api.get('/location/search', { params: { q } });
    return data.data || [];
  },
  async details(placeId: string): Promise<PlaceDetails> {
    const { data } = await api.get(`/location/details/${placeId}`);
    return data.data;
  },
  async reverse(lat: number, lng: number): Promise<PlaceDetails> {
    const { data } = await api.get('/location/reverse', { params: { lat, lng } });
    return data.data;
  },
};
