import * as mock from './mock/profile';
import * as http from './http/profile';
import { getAppMode } from '../contexts/AppModeContext';

const getImpl = () => (getAppMode() === 'demo' ? mock : http);

export const getProfile: typeof mock.getProfile = (...args) => getImpl().getProfile(...args);
export const updateProfile: typeof mock.updateProfile = (...args) => getImpl().updateProfile(...args);
export const clearProfile: typeof mock.clearProfile = (...args) => getImpl().clearProfile(...args);
