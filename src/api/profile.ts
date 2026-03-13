import * as mock from './mock/profile';
import * as http from './http/profile';

const impl = import.meta.env.VITE_API_URL ? http : mock;

export const getProfile = impl.getProfile;
export const updateProfile = impl.updateProfile;
export const clearProfile = impl.clearProfile;
