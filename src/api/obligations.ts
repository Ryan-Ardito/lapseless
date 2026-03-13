import * as mock from './mock/obligations';
import * as http from './http/obligations';

const impl = import.meta.env.VITE_API_URL ? http : mock;

export const getObligations = impl.getObligations;
export const createObligation = impl.createObligation;
export const updateObligation = impl.updateObligation;
export const deleteObligation = impl.deleteObligation;
export const restoreObligation = impl.restoreObligation;
export const toggleObligationComplete = impl.toggleObligationComplete;
export const seedObligations = impl.seedObligations;
