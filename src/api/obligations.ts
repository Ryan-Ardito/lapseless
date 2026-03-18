import * as mock from './mock/obligations';
import * as http from './http/obligations';
import { getAppMode } from '../contexts/AppModeContext';

const getImpl = () => (getAppMode() === 'demo' ? mock : http);

export const getObligations: typeof mock.getObligations = (...args) => getImpl().getObligations(...args);
export const createObligation: typeof mock.createObligation = (...args) => getImpl().createObligation(...args);
export const updateObligation: typeof mock.updateObligation = (...args) => getImpl().updateObligation(...args);
export const deleteObligation: typeof mock.deleteObligation = (...args) => getImpl().deleteObligation(...args);
export const restoreObligation: typeof mock.restoreObligation = (...args) => getImpl().restoreObligation(...args);
export const toggleObligationComplete: typeof mock.toggleObligationComplete = (...args) => getImpl().toggleObligationComplete(...args);
export const seedObligations: typeof mock.seedObligations = (...args) => getImpl().seedObligations(...args);
